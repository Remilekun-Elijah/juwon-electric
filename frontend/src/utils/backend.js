import API_INSTANCE from "./axios";
import Alert from "./Alert";
import axios from "axios";
import config from "./config.js";

class BACKEND {
  constructor(url = config.backendUrl, token) {
    const newInstance = axios.create();
    this._API = new API_INSTANCE({ url, token }).create(newInstance);
  }

  send({ type, to, payload, cb, header = {}, useAlert }) {
    return this._API({
      url: to,
      method: type,
      data: payload,
      header,
      signal: AbortSignal.timeout(120000 /* 2m */),
    })
      .then(function (response) {
        const msg = response?.data?.message,
          message = msg instanceof Array ? msg?.[0] : msg;

        if ([200, 201, 304].includes(response?.status)) {
          if (useAlert) {
            Alert({
              type: "success",
              message,
              cb: () => (cb ? cb(response?.data) : ""),
            });
          } else if (cb) cb(response?.data);

          return response?.data;
        } else {
          if (useAlert) {
            Alert({
              type: "error",
              message,
            });
          }
          return response?.data;
        }
      })
      .catch(function (e) {
        if (e?.name === "AbortError") {
          console.log("Axios terminated request");
        }
        const err = "error";
        const message = e?.message || e?.[err] || "Something went wrong";

        // if (useAlert) {
        message &&
          Alert({
            type: err,
            message: message instanceof Array ? message[0] : message,
          });
        // }
        return e;
      });
  }
}

export default BACKEND;
