import * as Cesium from 'cesium';

/**
 * Raises Cesium's download limits. The default (6 at once per server) is a bottleneck when several
 * layers come from the same tile server; modern servers (HTTP/2) handle many more.
 */
export function configureNetwork() {
  Cesium.RequestScheduler.maximumRequestsPerServer = 18;
  Cesium.RequestScheduler.requestsByServer['services.arcgisonline.com:443'] = 24;
}
