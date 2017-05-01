

let config = {
private_bgw: false,
tls_key: "./config/key.pem",
tls_cert: "./config/srv.pem",
request_client_cert: false,
client_ca_path: false,
enable_ALPN_mode:false,
enable_SNI_mode:true,
external_domain: "bgw.hareeqi.com",
servers:
  [
    {
    name:"http_proxy",
    bind_address: "0.0.0.0",
    bind_port: 443,
    dest_port:5050,
    dest_address:"127.0.0.1",
    allowed_addresses:[]
    },
    {
    name:"mqtt_proxy",
    bind_address: "0.0.0.0",
    bind_port: 8883,
    dest_port:5051,
    dest_address:"127.0.0.1",
    allowed_addresses:[]
    }
  ],
global_allowed_addresses:["0.0.0.0/0"],
aaa_client:{
    name:"external-interface",
    log_level:'info',
    no_color:false,
    timestamp:false,
    disable_cat:[]
  }
}

require('../iot-bgw-aaa-client').init("EI",config)
module.exports = config
