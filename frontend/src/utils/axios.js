// import Storage from "./storage";

class API_INSTANCE {
  constructor({ timeout = 60000 * 5 /* 5m */, url, token } = {}) {
    this.timeout = timeout;
    this.url = url;
    this.token = token;
  }

  create(instance) {
    const API = instance;

    API.defaults.baseURL = this.url;
    API.defaults.timeout = this.timeout;

    // API.defaults.headers.common["Authorization"] = `Bearer ${
    //   this.token || Storage.get(config.authProps[0])
    // }`;
    // API.defaults.headers.common["ngrok-skip-browser-warning"] = true;

    // const handleSessionExpired = (error) => {
    //   console.log(error);
    //   if (error.message === "canceled") {
    //     Alert({
    //       type: "error",
    //       message:
    //         "Looks like the server is taking too long to respond, please try again later.",
    //     });
    //   } else if (error.message === "Network Error") {
    //     Alert({
    //       type: "error",
    //       message: "Network error, please try again.",
    //     });
    //   } else {
    //     const msg = error?.response?.data?.message,
    //       message = msg instanceof Array ? msg[0] : msg;
    //     const isNotAuth = [
    //       "authorization",
    //       "auth",
    //       "authorized",
    //       "access forbidden",
    //       "jwt expired",
    //       "jwt",
    //       "Forbidden...You are using an expired token",
    //       "invalid signature",
    //     ].find(
    //       (msg) =>
    //         error?.response?.data?.error
    //           ?.toLowerCase()
    //           .includes(msg?.toLowerCase()) ||
    //         message?.toLowerCase().includes(msg?.toLowerCase())
    //     );
    //     const cb = () =>
    //         setTimeout(
    //           (_) => (window.location.href = config.routes.login),
    //           2000
    //         ),
    //       messages = "Session expired, please login again.";

    //     if ([403].includes(error?.response?.status) && isNotAuth) {
    //       Storage.remove(config.authProps[0]);
    //       Storage.remove(config.authProps[1]);
    //       Alert({ type: "error", message: messages, cb });
    //     } else {
    //       return Promise.reject(error?.response?.data);
    //     }
    //   }
    // };

    const handleSuccess = (response) => {
      return response;
    };

    API.interceptors.response.use(handleSuccess);

    API.interceptors.request.use(
      (configs) => {
        // const cb = () => setTimeout(_ => window.location.href = config.routes.login, 2000),
        //  message = 'You are not authorized, please login again';
        // if (Storage.get(config.authProps[0]) === null && window.location.pathname !== config.routes.login) {
        //  Alert({
        //   type: 'error',
        //   message,
        //   cb
        //  });
        // }

        return configs;
      },
      (error) => {
        // console.log(error);
        // if(error.message === "canceled"){
        //  Alert({type: "error", message: "Looks like the server is taking too long to respond, please try again in sometime."})
        // }
        return Promise.reject(error);
      }
    );

    return API;
  }
}

export default API_INSTANCE;
