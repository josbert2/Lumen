import type { DeviceFrameId } from "./data";

// Returns the inner HTML for the frame content given a device + image src.
// The device wrapper sits inside .frame and contains the image in its "screen".
export function renderDevice(
  device: DeviceFrameId,
  imageSrc: string,
  innerStyle: string,
): string {
  switch (device) {
    case "browser-safari":
      return `
        <div class="device device-browser browser-safari" style="${innerStyle}">
          <div class="browser-bar">
            <div class="traffic-lights">
              <span style="background:#ff5f57"></span>
              <span style="background:#febc2e"></span>
              <span style="background:#28c840"></span>
            </div>
            <div class="browser-url">https://lumen.app</div>
            <div class="browser-actions"></div>
          </div>
          <img src="${imageSrc}" class="device-screen" />
        </div>`;
    case "browser-chrome":
      return `
        <div class="device device-browser browser-chrome" style="${innerStyle}">
          <div class="browser-bar chrome">
            <div class="traffic-lights chrome-lights">
              <span></span><span></span><span></span>
            </div>
            <div class="chrome-tabs">
              <div class="chrome-tab active">Lumen</div>
            </div>
          </div>
          <div class="browser-bar chrome-url">
            <div class="chrome-url-bar">🔒 lumen.app</div>
          </div>
          <img src="${imageSrc}" class="device-screen" />
        </div>`;
    case "browser-dark":
      return `
        <div class="device device-browser browser-dark" style="${innerStyle}">
          <div class="browser-bar dark">
            <div class="traffic-lights">
              <span style="background:#ff5f57"></span>
              <span style="background:#febc2e"></span>
              <span style="background:#28c840"></span>
            </div>
            <div class="browser-url dark">lumen.app</div>
            <div class="browser-actions"></div>
          </div>
          <img src="${imageSrc}" class="device-screen" />
        </div>`;
    case "macbook":
      return `
        <div class="device device-macbook" style="${innerStyle}">
          <div class="macbook-body">
            <div class="macbook-camera"></div>
            <div class="macbook-screen">
              <img src="${imageSrc}" />
            </div>
          </div>
          <div class="macbook-base">
            <div class="macbook-notch"></div>
          </div>
        </div>`;
    case "iphone":
      return `
        <div class="device device-iphone" style="${innerStyle}">
          <div class="iphone-body">
            <div class="iphone-island"></div>
            <img src="${imageSrc}" class="iphone-screen" />
          </div>
        </div>`;
    case "ipad":
      return `
        <div class="device device-ipad" style="${innerStyle}">
          <div class="ipad-body">
            <img src="${imageSrc}" class="ipad-screen" />
          </div>
        </div>`;
    default:
      return `<img class="canvas-image" src="${imageSrc}" style="${innerStyle}" />`;
  }
}
