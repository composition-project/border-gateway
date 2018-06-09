# IoT Border Gateway

IoT Border Gateway, remote access and security for the Internet of Things, contains BGW external interface, http-proxy, mqtt-proxy and auth server

## Try it out

```
docker pull docker.linksmart.eu/bgw
docker run --rm -it -p 443:443 -e "ADMIN_KEY_PASSWORD=test" docker.linksmart.eu/bgw
```
* Admin key "admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz"
* [Test Link](https://localhost/bgw-auth/user?bgw_key=admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz) note: port 443 requires sudo access

## Usage

* Map a volume to /bgw/config that contains the three files below
 * Provide a certificate file ("[cert name].pem") - [example](./config/)
 * Provide a key file ("[key name].pem") - [example](./config/)
 * provide a config file (either [config.env](./config/config.env.example) or [config.json](./config/config.json.example) or both)
* You final docker run command looks like this.
```
docker run -p 80:80 -p 443:443 -p 8883:8883 -v /my/host/config:/bgw/config docker.linksmart.eu/bgw
```

## Swagger

* Click authorize and set the api key to "Bearer [BGW ADMIN KEY]"
* You can change the swagger target host host by changing the url
* Click here to use swagger [Click here](https://docs.linksmart.eu/display/BGW/API+Documentation)

## Configs

* All configs for the bgw are passed as environment variables
* You can supply environment variables from a file by providing config.env or config.json or both
* Each bgw component has a config prifix (**EI_, HTTP_PROXY_, MQTT_PROXY_, AUTH_SERVER_, AAA_CLIENT_**)
* Shared config like the aaa client, can be used globally like AAA_CLIENT_ or selectivily like EI_AAA_CLEINT_
* note: configs in config.json will be converted to environment variables and passed to all components
* For all available configurations list ([click here](./docs/config.md))

## Components

* [bgw-external-interface](../../bgw-external-interface)
* [bgw-auth-server](../../bgw-auth-server)
* [bgw-mqtt-proxy](../../bgw-mqtt-proxy)
* [bgw-http-proxy](../../bgw-http-proxy)
* [bgw-aaa-client](../../bgw-aaa-client)

## Development Mode

If you would like to further develop the bgw in your local machine:
1. Clone the rep by running this command
```
git clone https://code.linksmart.eu/scm/bgw/bgw.git
```

2. Build the dependencies for all components and remove the container using this command:
```
docker run --rm -it -v "$(pwd)"/bgw:/bgw docker.linksmart.eu/bgw build
```

3. Create and run a container with dependencies in dev mode:
```
docker run --rm -it -p 80:80 -p 443:443 -p 8883:8883 -v "$(pwd)"/bgw:/bgw docker.linksmart.eu/bgw dev
```
Whenever you change the code in you local dev folder the component will automatically restarts and your changes are reflected immediately

## Benchmarking

[iot-bgw-benchmark](../../iot-bgw-benchmark)