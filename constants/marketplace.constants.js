const { STUB_ADDRESS } = require('./common.constants')

const FEE_WALLET = process.env.FEE_WALLET || STUB_ADDRESS
const BACKEND_SIGNER = process.env.BACKEND_SIGNER || STUB_ADDRESS
const CURRENCY_ADDRESS = process.env.CURRENCY_ADDRESS || STUB_ADDRESS
const WHITELIST_ADDRESSES = process.env.WHITELIST_ADDRESSES?.split(',') || [STUB_ADDRESS]

module.exports = {
    FEE_WALLET,
    BACKEND_SIGNER,
    WHITELIST_ADDRESSES,
    CURRENCY_ADDRESS
}
