// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ILazySoccerNft.sol";

contract LazySoccerMarketplace is Ownable {
    enum CurrencyType {
        NATIVE,
        ERC20
    }

    address public nftContract;
    address public currencyContract;
    address public feeWallet;
    address public backendSigner;
    address[] public callTransactionWhitelist;

    event NftSold(uint256 indexed tokenId, address indexed buyer);
    event InGameAssetSold(address indexed buyer);

    constructor(address _nftContract, address _currencyContract, address _feeWallet, address _backendSigner, address[] memory _callTransactionWhitelist) {
        nftContract = _nftContract;
        currencyContract = _currencyContract;
        feeWallet = _feeWallet;
        backendSigner = _backendSigner;
        callTransactionWhitelist = _callTransactionWhitelist;
    }

    modifier onlyAvailableAddresses() {
        bool isValidAddress = false;
        uint256 length = callTransactionWhitelist.length;

        for (uint256 i; i < length;) {
            if (msg.sender == callTransactionWhitelist[i]) {
                isValidAddress = true;

                break;
            }
        unchecked {
            ++i;
        }
        }

        require(isValidAddress, "No permission");
        _;
    }

    function changeCallTransactionAddresses(
        address[] calldata _callTransactionWhitelist
    ) external onlyOwner {
        callTransactionWhitelist = _callTransactionWhitelist;
    }

    function changenftContract(address _nftContract) external onlyOwner {
        nftContract = _nftContract;
    }

    function changeCurrencyAddress(address _currencyContract) external onlyOwner {
        currencyContract = _currencyContract;
    }

    function changeBackendSigner(address _backendSigner) external onlyOwner {
        backendSigner = _backendSigner;
    }

    function changeFeeWallet(address _feeWallet) external onlyOwner {
        feeWallet = _feeWallet;
    }

//    function buyNft(
//        uint256 tokenId,
//        uint256 _nftPrice,
//        uint256 _transactionFee,
//        CurrencyType currency,
//        bytes memory signature
//    ) public payable {
//        address nftOwner = ILazySoccerNFT(nftContract).ownerOf(tokenId);
//        require(
//            ILazySoccerNFT(nftContract).checkIsNftLockedForMarket(
//                tokenId
//            ),
//            "Nft not on market"
//        );
//
//        bytes memory data = abi.encodePacked(
//            "0x",
//            _toAsciiString(msg.sender),
//            " can buy nft ",
//            tokenId,
//            " price:",
//            _nftPrice
//        );
//
//        require(
//            _checkSignOperator(data, signature),
//            "Transaction is not signed"
//        );
//
//        _sendCurrency(nftOwner, currency, _nftPrice, _transactionFee);
//
//        ILazySoccerNFT(nftContract).safeTransferFrom(
//            nftOwner,
//            msg.sender,
//            tokenId
//        );
//
//        emit NftSold(tokenId, msg.sender);
//    }
//
//    function buyIngameAsset(
//        uint256 inGameAssetId,
//        uint256 _price,
//        uint256 _transactionFee,
//        CurrencyType currency,
//        address to,
//        bytes memory signature
//    ) public payable {
//        bytes memory data = abi.encodePacked(
//            "0x",
//            _toAsciiString(msg.sender),
//            " can buy in-game asset ",
//            inGameAssetId,
//            " price:",
//            _price
//        );
//
//        require(
//            _checkSignOperator(data, signature),
//            "Transaction is not signed"
//        );
//
//        _sendCurrency(to, currency, _price, _transactionFee);
//
//        emit InGameAssetSold(msg.sender);
//    }
//
//    function _sendCurrency(
//        address to,
//        CurrencyType currency,
//        uint256 _price,
//        uint256 _transactionFee
//    ) private {
//        if (currency == CurrencyType.ERC20) {
//            require(
//                IERC20(currencyContract).balanceOf(msg.sender) >=
//                _price + _transactionFee,
//                "Insufficient balance"
//            );
//            require(
//                IERC20(currencyContract).allowance(
//                    msg.sender,
//                    address(this)
//                ) >= _price + _transactionFee,
//                "Insufficient allowance"
//            );
//
//            IERC20(currencyContract).transferFrom(
//                msg.sender,
//                to,
//                _price
//            );
//            IERC20(currencyContract).transferFrom(
//                msg.sender,
//                feeWallet,
//                _price
//            );
//        } else {
//            require(
//                msg.value >= _price + _transactionFee,
//                "Insufficient balance"
//            );
//
//            (bool success,) = to.call{value : _price}("");
//            require(success, "Transfer failed.");
//
//            (success,) = feeWallet.call{value : _transactionFee}("");
//            require(success, "Transfer failed.");
//        }
//    }
//
//    function _checkSignOperator(
//        bytes memory data,
//        bytes memory signature
//    ) private view returns (bool) {
//        bytes32 hash = _toEthSignedMessage(data);
//        address signer = ECDSA.recover(hash, signature);
//
//        return signer == _backendSigner;
//    }
//
//    function _toEthSignedMessage(
//        bytes memory message
//    ) internal pure returns (bytes32) {
//        return
//        keccak256(
//            abi.encodePacked(
//                "\x19Ethereum Signed Message:\n",
//                Strings.toString(message.length),
//                message
//            )
//        );
//    }
//
//    function _toAsciiString(address x) internal pure returns (string memory) {
//        bytes memory s = new bytes(40);
//        for (uint256 i = 0; i < 20; i++) {
//            bytes1 b = bytes1(
//                uint8(uint256(uint160(x)) / (2 ** (8 * (19 - i))))
//            );
//            bytes1 hi = bytes1(uint8(b) / 16);
//            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
//            s[2 * i] = _char(hi);
//            s[2 * i + 1] = _char(lo);
//        }
//        return string(s);
//    }
//
//    function _char(bytes1 b) private pure returns (bytes1 c) {
//        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
//        else return bytes1(uint8(b) + 0x57);
//    }
}
