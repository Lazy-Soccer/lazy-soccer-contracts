const { STUB_ADDRESS } = require('./common.constants');

const FEE_WALLET = process.env.FEE_WALLET || STUB_ADDRESS;
const FEE_SECOND_WALLET = STUB_ADDRESS;
const BACKEND_SIGNER = process.env.BACKEND_SIGNER || STUB_ADDRESS;
const CURRENCY_ADDRESS = process.env.CURRENCY_ADDRESS || STUB_ADDRESS;
const ADMIN = process.env.ADMIN?.split(',') || [STUB_ADDRESS];

module.exports = {
    FEE_WALLET,
    FEE_SECOND_WALLET,
    BACKEND_SIGNER,
    ADMIN,
    CURRENCY_ADDRESS,
};
