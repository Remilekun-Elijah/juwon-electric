class API_INSTANCE {
  constructor({ timeout = 60000 * 5 /* 5m */, url } = {}) {
    this.timeout = timeout;
    this.url = url;
  }

  create(instance) {
    const API = instance;

    API.defaults.baseURL = this.url;
    API.defaults.timeout = this.timeout;

    return API;
  }
}

export default API_INSTANCE;
