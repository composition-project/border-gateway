const config = require('./config');
const logger = require('../logger/log')(config.serviceName, config.logLevel);
const app = require('express')();
const bodyParser = require('body-parser');
const {Issuer} = require('openid-client');
const nonce = require('nonce')();
const url = require('url');
const validate = require("./validate");
const matchRules = require('./rules');
const decode64 = (b64) => Buffer.from(b64, 'base64').toString('utf8');

app.use(bodyParser.json());

let issuers = {};
let clients = {};

const configuredProviders = Object.keys(config.openid_connect_providers);
for (const key of configuredProviders) {
    issuers[key] = new Issuer({
        issuer: config.openid_connect_providers[key].issuer,
        authorization_endpoint: config.openid_connect_providers[key].authorization_endpoint,
        token_endpoint: config.openid_connect_providers[key].token_endpoint,
        jwks_uri: config.openid_connect_providers[key].jwks_uri
    }); // => Issuer
    console.log('Set up issuer %s %O', issuers[key].issuer, issuers[key].metadata);

    clients[key] = new issuers[key].Client({
        client_id: config.openid_connect_providers[key].client_id,
        client_secret: config.openid_connect_providers[key].client_secret
    });
}

// app.post('/auth/bgw/authenticate', async (req, res) => {
//
//     let openidConnectProviderName;
//
//     if (req.body) {
//         if (config.openid_connect_providers[req.body.openidConnectProviderName]) {
//             openidConnectProviderName = req.body.openidConnectProviderName;
//
//         } else {
//             openidConnectProviderName = 'default';
//
//         }
//     }
//     let openid_connect_provider = config.openid_connect_providers[openidConnectProviderName];
//     let auth_type = 'password';
//     let username = undefined;
//     let password = undefined;
//
//     if (req.headers && req.headers.authorization) {
//         let headerStrings = req.headers.authorization.split(' ');
//         if (headerStrings.length === 2) {
//             if ((headerStrings[0] === 'Bearer' || headerStrings[0] === 'bearer') && (username = headerStrings[1])) {
//                 auth_type = 'access_token';
//             } else if ((headerStrings[0] === 'Basic' || headerStrings[0] === 'basic') && (username = decode64(headerStrings[1]))) {
//                 let separatorPos = username.indexOf(":");
//                 password = username.substring((separatorPos + 1));
//                 username = username.substring(0, separatorPos);
//                 auth_type = 'password';
//             }
//         }
//     }
//
//     let source = `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`;
//     let authenticationResult;
//     if (username) {
//         authenticationResult = await validate.getProfile(openid_connect_provider, source, username, password, auth_type);
//     } else {
//         authenticationResult = {status: false, error: "No authorization header"};
//     }
//
//     if (authenticationResult.status) {
//         res.status(200).json({
//             isAuthenticated: true,
//             openidConnectProviderName: openidConnectProviderName,
//             rules: authenticationResult.profile.rules
//         });
//     } else {
//         res.status(200).json({
//             isAuthenticated: false,
//             openidConnectProviderName: openidConnectProviderName,
//             error: authenticationResult.error
//         });
//     }
// });

app.post('/auth/bgw/authorize', async (req, res) => {
        logger.log('debug', 'POST request to authorize endpoint', {
            body: req.body
        });
        if (req.body && req.body.rule && (typeof req.body.rule === 'string')) {

            let openidConnectProviderName;

            if (config.openid_connect_providers[req.body.openidConnectProviderName]) {
                openidConnectProviderName = req.body.openidConnectProviderName;

            } else {
                openidConnectProviderName = 'default';

            }
            let openid_connect_provider = config.openid_connect_providers[openidConnectProviderName];
            let auth_type = 'password';
            let username = undefined;
            let password = undefined;
            let authorizationCode = undefined;

            if (req.headers && req.headers.authorization) {
                let headerStrings = req.headers.authorization.split(' ');
                if (headerStrings.length === 2) {
                    if ((headerStrings[0] === 'Bearer' || headerStrings[0] === 'bearer') && (username = headerStrings[1])) {
                        auth_type = 'access_token';
                    } else if ((headerStrings[0] === 'Basic' || headerStrings[0] === 'basic') && (username = decode64(headerStrings[1]))) {
                        let separatorPos = username.indexOf(":");
                        password = username.substring((separatorPos + 1));
                        username = username.substring(0, separatorPos);
                        auth_type = 'password';
                    }
                }
            } else {
                if (req.body.code) {
                    auth_type = 'authorization_code';
                    authorizationCode = req.body.code;
                }
            }

            let source = `[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`;

            let authenticationResult;
            if (username) {
                authenticationResult = await validate.getProfile(openid_connect_provider, source, username, password, auth_type);
            } else if (authorizationCode) {

                //let redirectUrl = new url.URL(req.body.targetPath);
                //redirectUrl.pathname = '/callback';
                authenticationResult = await validate.getProfile(openid_connect_provider, source, username, password, auth_type, authorizationCode, openid_connect_provider.redirect_uri/*redirectUrl.toString()*/);
            } else {
                authenticationResult = {
                    status: true,
                    profile: {
                        user_id: "anonymous",
                        rules: (openid_connect_provider.anonymous_bgw_rules && openid_connect_provider.anonymous_bgw_rules.split(" "))
                    }
                }
            }

            let authorizationResult;
            if (authenticationResult.status) {
                authorizationResult = matchRules(authenticationResult.profile, req.body.rule, source);

                if (authorizationResult.status) {
                    res.status(200).json({
                        isAuthorized: true,
                        openidConnectProviderName: openidConnectProviderName
                    });
                } else {

                    let authUrl = undefined;
                    if (authenticationResult.profile.user_id === "anonymous") {
                        authorizationResult.error = "Forbidden for anonymous access"

                        authUrl = clients[openidConnectProviderName].authorizationUrl({
                            redirect_uri: openid_connect_provider.redirect_uri,
                            audience: openid_connect_provider.audience,
                            scope: "openid profile",
                            grant_type: "authorization_code",
                            nonce: nonce(),
                            state: req.body.targetPath
                        });

                        logger.log('debug', 'Authorization failed (anonymous)', {
                            authUrl: authUrl
                        });
                    }

                    res.status(200).json({
                        isAuthorized: false,
                        openidConnectProviderName: openidConnectProviderName,
                        authUrl: authUrl,
                        error: authorizationResult.error
                    });
                }

            }
            // authentication failed
            else {

                let authUrl = undefined;
                if (auth_type != "access_token") {
                    authUrl = clients[openidConnectProviderName].authorizationUrl({
                        redirect_uri: openid_connect_provider.redirect_uri,
                        audience: openid_connect_provider.audience,
                        scope: "openid profile",
                        grant_type: "authorization_code",
                        nonce: nonce(),
                        state: req.body.targetPath
                    });

                }

                logger.log('debug', 'Authentication failed', {
                    authUrl: authUrl
                });

                res.status(200).json({
                    isAuthorized: false,
                    openidConnectProviderName: openidConnectProviderName,
                    authUrl: authUrl,
                    error: authenticationResult.error
                });
            }
            return;
        }
        res.status(400).json({isAuthorized: false, error: "no rule string given"});
    }
)
;

app.listen(config.bind_port, () => {

    logger.log('info', config.serviceName + ' started', {
        port: config.bind_port
    });
});