// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./extensions/ERC721Lockable.sol";

contract LazySoccerMarketplace is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using ECDSAUpgradeable for bytes32;

    enum CurrencyType {
        NATIVE,
        ERC20
    }

    IERC20Upgradeable public currencyContract;
    address[] public feeWallets;
    address public backendSigner;
    mapping(address => bool) public availableCollections;
    mapping(address => bool) public lockableCollections;
    mapping(address => mapping(uint256 => address)) public listings;
    mapping(address => mapping(uint256 => bool)) private seenNonce;
    uint8 private feeReceiver;

    bytes32 private constant BUY_ITEM_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "BuyItem("
                "address buyer,",
                "address owner,",
                "address collection,",
                "uint256 tokenId,",
                "uint256 price,",
                "uint256 fee,",
                "uint8 currency,",
                "uint256 deadline,",
                "uint256 nonce"
                ")"
            )
        );

    bytes32 private constant BUY_IN_GAME_ASSET_TYPEHASH =
        keccak256(
            abi.encodePacked(
                "BuyInGameAsset("
                "address buyer,",
                "address owner,",
                "uint256 transferId,",
                "uint8 currency,",
                "uint256 price,",
                "uint256 fee,",
                "uint256 deadline,",
                "uint256 nonce"
                ")"
            )
        );

    event ListingCanceled(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed collection
    );
    event ItemListed(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed collection
    );
    event ItemBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        address collection,
        uint256 price,
        CurrencyType currency,
        uint256 nonce
    );
    event InGameAssetSold(
        address indexed buyer,
        address indexed inGameAssetOwner,
        uint256 transferId,
        uint256 nonce
    );

    modifier onlyAvailableCollections(address collection) {
        require(availableCollections[collection], "Collection isn't available");
        _;
    }

    function initialize(
        IERC20Upgradeable _currencyContract,
        address[] calldata _feeWallets,
        address _backendSigner,
        address[] memory _availableCollections,
        bool[] memory _lockableCollections
    ) public initializer {
        require(
            _availableCollections.length == _lockableCollections.length,
            "Invalid collections wallets length"
        );

        currencyContract = _currencyContract;
        feeWallets = _feeWallets;
        backendSigner = _backendSigner;

        for (uint256 i; i < _availableCollections.length; ) {
            availableCollections[_availableCollections[i]] = true;
            lockableCollections[
                _availableCollections[i]
            ] = _lockableCollections[i];

            unchecked {
                ++i;
            }
        }

        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __EIP712_init("Lazy Soccer Marketplace", "1");
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function changeCurrencyAddress(
        IERC20Upgradeable _currencyContract
    ) external onlyOwner {
        currencyContract = _currencyContract;
    }

    function changeBackendSigner(address _backendSigner) external onlyOwner {
        backendSigner = _backendSigner;
    }

    function changeFeeWallets(
        address[] calldata _feeWallets
    ) external onlyOwner {
        feeWallets = _feeWallets;
        feeReceiver = 0;
    }

    function addCollection(
        address _collection,
        bool _lockable
    ) external onlyOwner {
        availableCollections[_collection] = true;
        lockableCollections[_collection] = _lockable;
    }

    function removeCollection(address _collection) external onlyOwner {
        availableCollections[_collection] = false;
    }

    function listItem(
        uint256 tokenId,
        address collection
    ) external whenNotPaused onlyAvailableCollections(collection) {
        _listItem(tokenId, collection, lockableCollections[collection]);
    }

    function listBatch(
        uint256[] calldata tokenIds,
        address collection
    ) external whenNotPaused onlyAvailableCollections(collection) nonReentrant {
        bool lockable = lockableCollections[collection];

        for (uint256 i; i < tokenIds.length; ) {
            _listItem(tokenIds[i], collection, lockable);

            unchecked {
                ++i;
            }
        }
    }

    function cancelListing(
        uint256 tokenId,
        address collection
    ) external whenNotPaused {
        _cancelListing(tokenId, collection, lockableCollections[collection]);
    }

    function batchCancelListing(
        uint256[] calldata tokenIds,
        address collection
    ) external whenNotPaused {
        bool lockable = lockableCollections[collection];

        for (uint256 i; i < tokenIds.length; ) {
            _cancelListing(tokenIds[i], collection, lockable);

            unchecked {
                ++i;
            }
        }
    }

    function buyItem(
        uint256 tokenId,
        address collection,
        uint256 nftPrice,
        uint256 fee,
        CurrencyType currency,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    )
        external
        payable
        whenNotPaused
        onlyAvailableCollections(collection)
        nonReentrant
    {
        _buyItem(
            lockableCollections[collection],
            tokenId,
            collection,
            nftPrice,
            fee,
            currency,
            deadline,
            nonce,
            signature
        );
    }

    function buyInGameAsset(
        uint256 transferId,
        uint256 price,
        uint256 transactionFee,
        uint256 deadline,
        uint256 nonce,
        CurrencyType currency,
        address inGameAssetOwner,
        bytes memory signature
    ) external payable whenNotPaused nonReentrant {
        _buyInGameAsset(
            transferId,
            price,
            transactionFee,
            deadline,
            nonce,
            currency,
            inGameAssetOwner,
            signature
        );
    }

    function batchBuyItem(
        uint256[] calldata tokenIds,
        uint256[] calldata nftPrices,
        uint256[] calldata fees,
        CurrencyType currency,
        address collection,
        uint256 deadline,
        uint256[] memory nonces,
        bytes[] memory signatures
    )
        external
        payable
        whenNotPaused
        onlyAvailableCollections(collection)
        nonReentrant
    {
        require(
            tokenIds.length == nftPrices.length &&
                tokenIds.length == fees.length &&
                tokenIds.length == nonces.length &&
                tokenIds.length == signatures.length,
            "Invalid array length"
        );

        if (currency == CurrencyType.NATIVE) {
            require(
                _getArraySums(nftPrices, fees) == msg.value,
                "Insufficient eth value"
            );
        }

        bool lockable = lockableCollections[collection];

        for (uint256 i; i < tokenIds.length; ) {
            _buyItem(
                lockable,
                tokenIds[i],
                collection,
                nftPrices[i],
                fees[i],
                currency,
                deadline,
                nonces[i],
                signatures[i]
            );

            unchecked {
                ++i;
            }
        }
    }

    function batchBuyInGameAsset(
        uint256[] calldata transferIds,
        uint256[] calldata prices,
        uint256[] calldata transactionFees,
        uint256 deadline,
        uint256[] memory nonces,
        CurrencyType currency,
        address[] memory inGameAssetOwners,
        bytes[] memory signatures
    ) external payable whenNotPaused nonReentrant {
        require(
            transferIds.length == prices.length &&
                transferIds.length == transactionFees.length &&
                transferIds.length == nonces.length &&
                transferIds.length == inGameAssetOwners.length &&
                transferIds.length == signatures.length,
            "Invalid array length"
        );

        if (currency == CurrencyType.NATIVE) {
            require(
                _getArraySums(prices, transactionFees) == msg.value,
                "Insufficient eth value"
            );
        }

        for (uint256 i; i < transferIds.length; ) {
            _buyInGameAsset(
                transferIds[i],
                prices[i],
                transactionFees[i],
                deadline,
                nonces[i],
                currency,
                inGameAssetOwners[i],
                signatures[i]
            );

            unchecked {
                ++i;
            }
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function _sendFunds(
        address to,
        CurrencyType currency,
        uint256 price,
        uint256 fee
    ) private {
        if (currency == CurrencyType.ERC20) {
            currencyContract.safeTransferFrom(msg.sender, to, price);
            currencyContract.safeTransferFrom(
                msg.sender,
                feeWallets[feeReceiver],
                fee
            );
        } else {
            require(msg.value >= price + fee, "Insufficient eth value");

            (bool success, ) = to.call{value: price}("");
            require(success, "Transfer failed");

            (success, ) = feeWallets[feeReceiver].call{value: fee}("");
            require(success, "Transfer failed");

            uint length = feeWallets.length;

            if (length > 1) {
                uint8 nextReceiver = feeReceiver + 1;
                feeReceiver = nextReceiver == length ? 0 : nextReceiver;
            }
        }
    }

    function _buyItem(
        bool lockable,
        uint256 tokenId,
        address collection,
        uint256 nftPrice,
        uint256 fee,
        CurrencyType currency,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) private {
        address nftOwner = listings[collection][tokenId];
        require(nftOwner != address(0), "NFT is not listed");
        require(nftOwner != msg.sender, "You can't buy your own item");
        require(!seenNonce[msg.sender][nonce], "Already used nonce");
        require(block.timestamp < deadline, "Deadline finished");

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    BUY_ITEM_TYPEHASH,
                    msg.sender,
                    nftOwner,
                    collection,
                    tokenId,
                    nftPrice,
                    fee,
                    uint8(currency),
                    deadline,
                    nonce
                )
            )
        );

        require(hash.recover(signature) == backendSigner, "Bad signature");

        seenNonce[msg.sender][nonce] = true;
        delete listings[collection][tokenId];

        ERC721Lockable(collection).safeTransferFrom(
            address(this),
            msg.sender,
            tokenId
        );
        if (lockable) {
            ERC721Lockable(collection).lockNftForGame(tokenId);
        }

        _sendFunds(nftOwner, currency, nftPrice, fee);

        emit ItemBought(
            tokenId,
            msg.sender,
            nftOwner,
            collection,
            nftPrice,
            currency,
            nonce
        );
    }

    function _buyInGameAsset(
        uint256 transferId,
        uint256 price,
        uint256 transactionFee,
        uint256 deadline,
        uint256 nonce,
        CurrencyType currency,
        address inGameAssetOwner,
        bytes memory signature
    ) private {
        require(msg.sender != inGameAssetOwner, "Can't buy own asset");
        require(!seenNonce[msg.sender][nonce], "Already used nonce");
        require(block.timestamp < deadline, "Deadline finished");

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    BUY_IN_GAME_ASSET_TYPEHASH,
                    msg.sender,
                    inGameAssetOwner,
                    transferId,
                    uint8(currency),
                    price,
                    transactionFee,
                    deadline,
                    nonce
                )
            )
        );

        require(hash.recover(signature) == backendSigner, "Bad signature");

        seenNonce[msg.sender][nonce] = true;

        _sendFunds(inGameAssetOwner, currency, price, transactionFee);

        emit InGameAssetSold(msg.sender, inGameAssetOwner, transferId, nonce);
    }

    function _listItem(
        uint256 tokenId,
        address collection,
        bool lockable
    ) private {
        require(listings[collection][tokenId] == address(0), "Already listed");

        if (lockable && ERC721Lockable(collection).isLocked(tokenId)) {
            ERC721Lockable(collection).unlockNftForGame(tokenId);
        }

        ERC721Lockable(collection).transferFrom(
            msg.sender,
            address(this),
            tokenId
        );
        listings[collection][tokenId] = msg.sender;

        emit ItemListed(tokenId, msg.sender, collection);
    }

    function _cancelListing(
        uint256 tokenId,
        address collection,
        bool lockable
    ) private {
        require(
            listings[collection][tokenId] == msg.sender,
            "No access to listing"
        );

        delete listings[collection][tokenId];

        ERC721Lockable(collection).safeTransferFrom(
            address(this),
            msg.sender,
            tokenId
        );

        if (lockable) {
            ERC721Lockable(collection).lockNftForGame(tokenId);
        }

        emit ListingCanceled(tokenId, msg.sender, collection);
    }

    function _getArraySums(
        uint256[] memory arr1,
        uint256[] memory arr2
    ) private pure returns (uint256 sum) {
        for (uint256 i; i < arr1.length; ) {
            sum += arr1[i] + arr2[i];

            unchecked {
                ++i;
            }
        }
    }
}
