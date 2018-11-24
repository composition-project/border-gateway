const config = require('./config');
const {AAA, CAT, debug, isDebugOn} = require('../bgw-aaa-client');
const app = require('express')();
const {requestAuth} = require('./request_auth');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.use(async (req, res) => {

    AAA.log(CAT.DEBUG, 'body',req.body)
        if (req.body && req.body.input) {
            const result = await requestAuth(req);

            if (result.status) {

                res.status(200).json({output: true});
            }
            else {

                res.status(401).json({output: false, error: result.error});
            }
            return;
        }
        res.status(401).json({error: "no input field"});
    }
);

app.listen(config.bind_port, () =>
    AAA.log(CAT.PROCESS_START, `Listening on port ${config.bind_port}`));

