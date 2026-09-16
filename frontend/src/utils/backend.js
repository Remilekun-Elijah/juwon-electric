import API_INSTANCE from "./axios";
import Alert from "./Alert";
import axios from "axios";
import config from "./config.js";

class BACKEND {
  constructor(url = config.backendUrl) {
    const newInstance = axios.create();
    this._API = new API_INSTANCE({ url }).create(newInstance);
  }

  send({ type, to, payload, cb, header = {}, useAlert }) {
    return this._API({
      url: to,
      method: type,
      data: payload,
      headers: header,
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
        const message =
          e?.response?.data?.message ||
          e?.message ||
          e?.error ||
          "Something went wrong";

        Alert({
          type: "error",
          message: message instanceof Array ? message[0] : message,
        });
        return e?.response?.data || e;
      });
  }
}

export default BACKEND;
