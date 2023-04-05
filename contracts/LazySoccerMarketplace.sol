// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./interfaces/ILazySoccerNft.sol";
import "./utils/SignatureResolver.sol";

    error AlreadyListed(uint256 tokenId);

contract LazySoccerMarketplace is
SignatureResolver,
Initializable,
UUPSUpgradeable,
OwnableUpgradeable,
PausableUpgradeable
{
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
    mapping(address => mapping(uint256 => bool)) private seenNonce;

    event ListingCanceled(uint256 indexed tokenId, address indexed seller);
    event ItemListed(uint256 indexed tokenId, address indexed seller);
    event ItemBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        CurrencyType currency
    );
    event InGameAssetSold(address indexed buyer);

    modifier onlyAvailableAddresses() {
        bool isValidAddress = false;
        uint256 length = callTransactionWhitelist.length;

        for (uint256 i; i < length; ) {
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

    function initialize(
        ILazySoccerNFT _nftContract,
        IERC20 _currencyContract,
        address _feeWallet,
        address _backendSigner,
        address[] memory _callTransactionWhitelist
    ) public initializer {
        nftContract = _nftContract;
        currencyContract = _currencyContract;
        feeWallet = _feeWallet;
        backendSigner = _backendSigner;
        callTransactionWhitelist = _callTransactionWhitelist;
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function changeCallTransactionAddresses(
        address[] calldata _callTransactionWhitelist
    ) external onlyOwner {
        callTransactionWhitelist = _callTransactionWhitelist;
    }

    function changeNftContract(ILazySoccerNFT _nftContract) external onlyOwner {
        nftContract = _nftContract;
    }

    function changeCurrencyAddress(
        IERC20 _currencyContract
    ) external onlyOwner {
        currencyContract = _currencyContract;
    }

    function changeBackendSigner(address _backendSigner) external onlyOwner {
        backendSigner = _backendSigner;
    }

    function changeFeeWallet(address _feeWallet) external onlyOwner {
        feeWallet = _feeWallet;
    }

    function listItem(uint256 tokenId) external whenNotPaused {
        if (listings[tokenId] != address(0)) {
            revert AlreadyListed(tokenId);
        }

        nftContract.transferFrom(msg.sender, address(this), tokenId);
        listings[tokenId] = msg.sender;

        emit ItemListed(tokenId, msg.sender);
    }

    function cancelListing(uint256 tokenId) external whenNotPaused {
        require(listings[tokenId] == msg.sender, "No access to listing");

        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
        delete listings[tokenId];

        emit ListingCanceled(tokenId, msg.sender);
    }

    function buyItem(
        uint256 tokenId,
        uint256 nftPrice,
        uint256 fee,
        CurrencyType currency,
        uint256 nonce,
        bytes memory signature
    ) public payable whenNotPaused {
        address nftOwner = listings[tokenId];
        require(nftOwner != address(0), "NFT is not listed");
        require(nftOwner != msg.sender, "You can't buy your own item");
        require(!seenNonce[msg.sender][nonce], "Already used nonce");

        bytes32 hash = keccak256(
            abi.encodePacked(
                "Buy NFT-",
                "0x",
                _toAsciiString(msg.sender),
                "-",
                _uint256ToString(tokenId),
                "-",
                _uint256ToString(nftPrice),
                "-",
                _uint256ToString(fee),
                "-",
                _uint256ToString(uint8(currency)),
                "-",
                _uint256ToString(nonce)
            )
        );
        require(
            _checkSignOperator(hash, signature, backendSigner),
            "Transaction is not signed"
        );

        seenNonce[msg.sender][nonce] = true;
        delete listings[tokenId];

        _sendFunds(nftOwner, currency, nftPrice, fee);
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);

        emit ItemBought(tokenId, msg.sender, nftOwner, nftPrice, currency);
    }

    function buyInGameAsset(
        uint256 inGameAssetId,
        uint256 price,
        uint256 transactionFee,
        uint256 nonce,
        CurrencyType currency,
        address inGameAssetOwner,
        bytes memory signature
    ) public payable {
        require(msg.sender != inGameAssetOwner, "Can't buy own asset");
        require(!seenNonce[msg.sender][nonce], "Already used nonce");

        bytes32 hash = keccak256(
            abi.encodePacked(
                "Buy in-game asset-",
                "0x",
                _toAsciiString(msg.sender),
                "-",
                "0x",
                _toAsciiString(inGameAssetOwner),
                "-",
                _uint256ToString(inGameAssetId),
                "-",
                _uint256ToString(uint8(currency)),
                "-",
                _uint256ToString(price),
                "-",
                _uint256ToString(transactionFee),
                "-",
                _uint256ToString(nonce)
            )
        );
        require(
            _checkSignOperator(hash, signature, backendSigner),
            "Transaction is not signed"
        );

        seenNonce[msg.sender][nonce] = true;

        _sendFunds(inGameAssetOwner, currency, price, transactionFee);

        emit InGameAssetSold(msg.sender);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function _sendFunds(
        address to,
        CurrencyType currency,
        uint256 price,
        uint256 fee
    ) internal {
        if (currency == CurrencyType.ERC20) {
            currencyContract.transferFrom(msg.sender, to, price);
            currencyContract.transferFrom(msg.sender, feeWallet, fee);
        } else {
            require(msg.value == price + fee, "Insufficient eth value");

            (bool success, ) = to.call{value: price}("");
            require(success, "Transfer failed");

            (success, ) = feeWallet.call{value: fee}("");
            require(success, "Transfer failed");
        }
    }
}
