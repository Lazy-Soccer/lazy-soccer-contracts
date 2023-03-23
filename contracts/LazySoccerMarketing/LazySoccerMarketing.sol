// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../LazySoccerNFT/ILazySoccerNft.sol";

contract LazySoccerMarketplace is Ownable {
    event NftSold(uint256 indexed tokenId, address indexed buyer);
    event IngameAssetSold(address indexed buyer);

    enum CurrecyType {
        NATIVE,
        ERC20
    }

    address public nftContractAddress;
    address public currencyContractAddress;
    address private _feeWallet;
    address private _backendSigner;

    constructor(address _nftContractAddress, address _currencyContractAddress) {
        nftContractAddress = _nftContractAddress;
        currencyContractAddress = _currencyContractAddress;
        _feeWallet = 0x3DA9Ac2697abe7feB96d7438aa4bd7720c1D8b18;
        _backendSigner = 0xbA5D6481721A2d596dF6C7fA3e5943Aa9bF9dFAF;
    }

    function buyNft(
        uint256 tokenId,
        uint256 _nftPrice,
        uint256 _transactionFee,
        CurrecyType currency,
        bytes memory signature
    ) public payable {
        address nftOwner = ILazySoccerNFT(nftContractAddress).ownerOf(tokenId);
        require(
            ILazySoccerNFT(nftContractAddress).checkIsNftLockedForMarket(
                tokenId
            ),
            "Nft not on market"
        );

        bytes memory data = abi.encodePacked(
            "0x",
            _toAsciiString(msg.sender),
            " can buy nft ",
            _uint256ToString(tokenId),
            " with currency ",
            _uint256ToString(uint8(currency)),
            " price ",
            _uint256ToString(_nftPrice)
        );

        require(
            _checkSignOperator(data, signature),
            "Transaction is not signed"
        );

        _sendCurrency(nftOwner, currency, _nftPrice, _transactionFee);

        ILazySoccerNFT(nftContractAddress).safeTransferFrom(
            nftOwner,
            msg.sender,
            tokenId
        );

        emit NftSold(tokenId, msg.sender);
    }

    function buyIngameAsset(
        uint256 ingameAssetId,
        uint256 _price,
        uint256 _transactionFee,
        CurrecyType currency,
        address ingameAssetOwner,
        bytes memory signature
    ) public payable {
        bytes memory data = abi.encodePacked(
            "0x",
            _toAsciiString(msg.sender),
            " can buy ingame asset ",
            _uint256ToString(ingameAssetId),
            " with currency ",
            _uint256ToString(uint8(currency)),
            " price ",
            _uint256ToString(_price)
        );

        require(
            _checkSignOperator(data, signature),
            "Transaction is not signed"
        );

        _sendCurrency(ingameAssetOwner, currency, _price, _transactionFee);

        emit IngameAssetSold(msg.sender);
    }

    function _sendCurrency(
        address to,
        CurrecyType currency,
        uint256 _price,
        uint256 _transactionFee
    ) private {
        if (currency == CurrecyType.ERC20) {
            require(
                IERC20(currencyContractAddress).balanceOf(msg.sender) >=
                    _price + _transactionFee,
                "Insufficient balance"
            );
            require(
                IERC20(currencyContractAddress).allowance(
                    msg.sender,
                    address(this)
                ) >= _price + _transactionFee,
                "Insufficient allowance"
            );

            IERC20(currencyContractAddress).transferFrom(
                msg.sender,
                to,
                _price
            );
            IERC20(currencyContractAddress).transferFrom(
                msg.sender,
                _feeWallet,
                _transactionFee
            );
        } else {
            require(
                msg.value >= _price + _transactionFee,
                "Insufficient balance"
            );

            (bool success, ) = to.call{value: _price}("");
            require(success, "Transfer failed.");

            (success, ) = _feeWallet.call{value: _transactionFee}("");
            require(success, "Transfer failed.");
        }
    }

    function _checkSignOperator(
        bytes memory data,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 hash = _toEthSignedMessage(data);
        address signer = ECDSA.recover(hash, signature);

        return signer == _backendSigner;
    }

    function _toEthSignedMessage(
        bytes memory message
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n",
                    Strings.toString(message.length),
                    message
                )
            );
    }

    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(
                uint8(uint256(uint160(x)) / (2 ** (8 * (19 - i))))
            );
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = _char(hi);
            s[2 * i + 1] = _char(lo);
        }
        return string(s);
    }

    function _uint256ToString(
        uint256 value
    ) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _char(bytes1 b) private pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function changeNftContractAddress(address _newAddress) public onlyOwner {
        nftContractAddress = _newAddress;
    }

    function changeCurrencyContractAddress(
        address _newAddress
    ) public onlyOwner {
        currencyContractAddress = _newAddress;
    }

    function changeFeeWalletAddress(address _newAddress) public onlyOwner {
        _feeWallet = _newAddress;
    }

    function changeBackendSignerAddress(address _newAddress) public onlyOwner {
        _backendSigner = _newAddress;
    }

    function withdrawCoin(address _coin) public onlyOwner {
        uint256 amount = IERC20(_coin).balanceOf(address(this));
        IERC20(_coin).transfer(msg.sender, amount);
    }

    function withdraw() public onlyOwner {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success);
    }
}
