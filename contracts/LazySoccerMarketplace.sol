// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ILazySoccerNft.sol";

    error AlreadyListed(uint256 tokenId);


contract LazySoccerMarketplace is Ownable {
    enum CurrencyType {
        NATIVE,
        ERC20
    }

    ILazySoccerNFT public nftContract;
    IERC20 public currencyContract;
    address public feeWallet;
    address public backendSigner;
    address[] public callTransactionWhitelist;
    mapping(uint256 => address) public listings;
    mapping(address => mapping(uint256 => bool)) public seenNonce;

    event ListingCanceled(uint256 indexed tokenId, address indexed seller);
    event ItemListed(uint256 indexed tokenId, address indexed seller);
    event ItemBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, CurrencyType currency);
    event InGameAssetSold(address indexed buyer);

    constructor(ILazySoccerNFT _nftContract, IERC20 _currencyContract, address _feeWallet, address _backendSigner, address[] memory _callTransactionWhitelist) {
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

    function changenftContract(ILazySoccerNFT _nftContract) external onlyOwner {
        nftContract = _nftContract;
    }

    function changeCurrencyAddress(IERC20 _currencyContract) external onlyOwner {
        currencyContract = _currencyContract;
    }

    function changeBackendSigner(address _backendSigner) external onlyOwner {
        backendSigner = _backendSigner;
    }

    function changeFeeWallet(address _feeWallet) external onlyOwner {
        feeWallet = _feeWallet;
    }

    function listItem(uint256 tokenId) external {
        if (listings[tokenId] != address(0)) {
            revert AlreadyListed(tokenId);
        }

        nftContract.transferFrom(msg.sender, address(this), tokenId);
        listings[tokenId] = msg.sender;

        emit ItemListed(tokenId, msg.sender);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId] == msg.sender, 'No access to listing');

        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
        delete listings[tokenId];

        emit ListingCanceled(tokenId, msg.sender);
    }

    function buyItem(
        uint256 tokenId,
        uint256 nftPrice,
        uint256 fee,
        uint256 nonce,
        CurrencyType currency,
        bytes memory signature
    ) public payable {
        address nftOwner = listings[tokenId];
        require(nftOwner == address(0), 'NFT is not listed');
        require(!seenNonce[msg.sender][nonce], 'Used nonce');

        bytes32 hash = keccak256(abi.encodePacked(
                'Buy NFT',
                _toAsciiString(msg.sender),
                _uint256ToString(nftPrice),
                _uint256ToString(tokenId),
                _uint256ToString(fee),
                _uint256ToString(uint8(currency)),
                _uint256ToString(nonce)
            ));
        require(
            _checkSignOperator(hash, signature),
            "Transaction is not signed"
        );

        seenNonce[msg.sender][nonce] = true;
        delete listings[tokenId];

        _sendFunds(nftOwner, currency, nftPrice, fee);
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            tokenId
        );

        emit ItemBought(tokenId, msg.sender, nftOwner, nftPrice, currency);
    }

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
    function _sendFunds(
        address to,
        CurrencyType currency,
        uint256 price,
        uint256 fee
    ) private {
        if (currency == CurrencyType.ERC20) {
            currencyContract.transferFrom(
                msg.sender,
                to,
                price
            );
            currencyContract.transferFrom(
                msg.sender,
                feeWallet,
                fee
            );
        } else {
            require(
                msg.value == price + fee,
                "Insufficient eth value"
            );

            (bool success,) = to.call{value : price}("");
            require(success, "Transfer failed");

            (success,) = feeWallet.call{value : fee}("");
            require(success, "Transfer failed");
        }
    }

    function _checkSignOperator(
        bytes32 hash,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 messageHash = _toEthSignedMessage(hash);
        address signer = ECDSA.recover(messageHash, signature);

        return signer == backendSigner;
    }

    function _toEthSignedMessage(
        bytes32 hash
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n",
                hash
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

    function _char(bytes1 b) private pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
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
}
