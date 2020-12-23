/*
 * @Author: Squall Sha
 * @Date: 2020-11-17 11:17:24
 * @Last Modified by: Squall Sha
 * @Last Modified time: 2020-12-23 11:45:25
 */

interface ResponseObj {
  code?: string;
  context?: any;
  data?: object;
}

const openNotification = (type: string, res: string) => {
  (window as any).Notification[type]({
    message: res,
    duration: 3
  });
};

const checkResponse = (res: ResponseObj, resolve: any, reject: any) => {
  if (res.code === '1100011' || res.code === '1300010') {
    reject(res);
    const redirectParams = {
      client_id: 'data_platform_viz',
      response_type: 'code',
      scope: 'all',
      redirect_uri: `${(window as any).location.origin}${(window as any).location.pathname}`
    };
    const authPath = '/oauth/authorize';
    const redirectUrl = `${(window as any).ssoUrl}${authPath}?client_id=${redirectParams.client_id}&response_type=${redirectParams.response_type}&scope=${redirectParams.scope}&redirect_uri=${redirectParams.redirect_uri}`;
    location.href = redirectUrl;
  } else if(res.context) {
    const {
      context: { status, message },
      data
    } = res;
    if (status === 200) {
      resolve(data);
    }else {
      openNotification('error', message);
      reject({ status, message });
    }
  }else {
    resolve(res);
  }
};

const parseJSON = (response: any) => {
  return response.json();
};

const _fetch = (requestPromise: any, timeout: number = 60000) => {
  let timeoutAction: any = null;
  const timerPromise = new Promise((resolve, reject) => {
    timeoutAction = () => {
      reject(new Error('timeout'));
    };
  });
  setTimeout(() => {
    timeoutAction();
  }, timeout);
  return Promise.race([requestPromise, timerPromise]);
};

export default (url: string, data: any, type: string, singleSpa: object, timeOut: number) => {
  type = type.toUpperCase();

  const requestConfig: RequestInit = {
    credentials: 'include',
    method: type,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    mode: 'cors',
    cache: 'force-cache'
  };

  if (type === 'POST') {
    Object.defineProperty(requestConfig, 'body', {
      value: JSON.stringify(data)
    });
  }

  if (type === 'GET' && data) {
    const paramsArray:any[] = [];
    Object.keys(data).forEach(key => paramsArray.push(`${key}=${data[key]}`));
    if (url.search(/\?/) === -1) {
      url += `?${paramsArray.join('&')}`;
    } else {
      url += `&${paramsArray.join('&')}`;
    }
  }

  const opts = requestConfig;
  try {
    const defer = new Promise((resolve, reject) => {
      _fetch(fetch(url, opts), timeOut)
        .then(res => {
          if (res.status === 404) {
            reject(res.statusText);
          }
          return parseJSON(res);
        })
        .then(res => {
          checkResponse(res, resolve, reject);
        })
        .catch(error => {
          reject(error);
        });
    });
    return defer;
  } catch (error) {
    throw new Error(error);
  }
};
