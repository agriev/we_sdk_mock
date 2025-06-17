class Error301 extends Error {
  status = 301;

  constructor(url) {
    super();

    this.url = url;
  }
}

export default Error301;
