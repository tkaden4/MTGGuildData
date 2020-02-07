// shim to allow csv imports by parcel/webpack
declare module "*.csv" {
  export default string;
}
