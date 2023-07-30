// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC721A} from "erc721a/contracts/ERC721A.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {DefaultOperatorFilterer} from "operator-filter-registry/src/DefaultOperatorFilterer.sol";

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
//                                                                                                           //
//                                                                                                           //
//       _____                    _         _____      _ _           _   _                                   //
//      / ____|                  (_)       / ____|    | | |         | | (_)                                  //
//     | |     ___  ___ _ __ ___  _  ___  | |     ___ | | | ___  ___| |_ _  ___  _ __                        //
//     | |    / _ \/ __| '_ ` _ \| |/ __| | |    / _ \| | |/ _ \/ __| __| |/ _ \| '_ \                       //
//     | |___| (_) \__ \ | | | | | | (__  | |___| (_) | | |  __/ (__| |_| | (_) | | | |                      //
//      \_____\___/|___/_| |_| |_|_|\___|  \_____\___/|_|_|\___|\___|\__|_|\___/|_| |_|                      //
//                                                                                                           //
//                                                                                                           //
//                                                                                                           //
//     @title  Cosmic Collection: Space Helmets                                                              //
//     @author 0xBelletz                                                                                     //
//                                                                                                           //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

contract AstroHelmetsV2 is
    ERC721A,
    Ownable,
    ReentrancyGuard,
    DefaultOperatorFilterer,
    ERC2981
{
    using Strings for uint256;

    /// @dev Metadata
    string public contractURI;
    string public baseURI;
    string public hiddenMetadataUri;
    string public baseExtension = ".json";
    uint256 public revealTime;
    bool public revealed = false;
    bool public isFrozen;

    /// @notice Max batch per transaction
    uint256 public constant MAX_SPACE_HELMETS_PURCHASE = 20;

    /// @notice Max supply of SPACE_HELMETS
    uint256 public constant MAX_SPACE_HELMETS_NFT = 10000;

    /// @notice Public sale final price - ETH
    uint256 public constant SPACE_HELMETS_SALE_PRICE = 0.08 ether;

    /// @dev Public sale params
    uint256 public publicSaleDuration;
    uint256 public publicSaleStartTime;

    /// @dev Public sale switches
    bool public publicSaleActive = false;

    constructor(
        string memory _contractURI,
        string memory _hiddenMetadataUri,
        address _splitter,
        uint96 _royaltyFeesInBips
    ) ERC721A("Cosmic Collection: Astro  Helmets", "CCSH") {
        require(_splitter != address(0), "zero_addr");
        _setDefaultRoyalty(_splitter, _royaltyFeesInBips);
        setContractURI(_contractURI);
        setHiddenMetadataUri(_hiddenMetadataUri);
    }

    /// @dev events on chain
    event PublicSaleStart(
        uint256 indexed publicSaleDuration,
        uint256 indexed publicSaleStartTime
    );

    event PublicSalePaused(uint256 indexed timeElapsed);
    event Revealed(bool indexed revealed);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    modifier isPublicSaleActive() {
        require(publicSaleActive, "Public sale is not active");
        _;
    }
    modifier isMetadataFrozen() {
        require(!isFrozen, "Metadata ia already frozen!");
        _;
    }

    /// @dev Base params setters
    function setRevealed(
        bool _state,
        string memory newBaseURI
    ) public onlyOwner isMetadataFrozen {
        require(!publicSaleActive, "Public sale is running!");
        require(!revealed, "Collection already revealed!");
        setBaseURI(newBaseURI);
        revealed = _state;
        emit Revealed(revealed);
        emit BatchMetadataUpdate(0, totalSupply());
    }

    function setHiddenMetadataUri(
        string memory _hiddenMetadataUri
    ) public onlyOwner {
        hiddenMetadataUri = _hiddenMetadataUri;
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        contractURI = _contractURI;
    }

    function setBaseURI(
        string memory newBaseURI
    ) public onlyOwner isMetadataFrozen {
        baseURI = newBaseURI;
    }

    function setBaseExtension(
        string memory _newBaseExtension
    ) public onlyOwner isMetadataFrozen{
        baseExtension = _newBaseExtension;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    /// @dev Froze metadata after reveal.
    function freezeMetadata() external onlyOwner isMetadataFrozen {
        require(revealed, "Metadata are not revealed yet!");
        isFrozen = true;
    }

    /// @notice Get the token uri of a minted SPACE HELMET.
    /// @param tokenId NFT ID.
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721A) returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        if (revealed == false) {
            return hiddenMetadataUri;
        }
        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        _toString(tokenId),
                        baseExtension
                    )
                )
                : "";
    }

    // PUBLIC SALE MANAGEMENT

    /// @dev Start public sale and set reveal time
    /// @param saleDuration New sale duration.
    function startPublicSale(uint256 saleDuration) external onlyOwner {
        require(!publicSaleActive, "Public sale has already begun");
        publicSaleDuration = saleDuration;
        publicSaleStartTime = block.timestamp;
        publicSaleActive = true;
        revealTime = publicSaleStartTime + publicSaleDuration + 2 days;
        emit PublicSaleStart(publicSaleStartTime, publicSaleDuration);
    }

    /// @dev Stop public sale.
    function stopPublicSale() external onlyOwner isPublicSaleActive {
        publicSaleActive = !publicSaleActive;
        emit PublicSalePaused(getElapsedSaleTime());
    }

    /// @notice Get public sale elapsed time.
    function getElapsedSaleTime()
        internal
        view
        returns (uint256)
    {
        return
            publicSaleStartTime > 0 ? block.timestamp - publicSaleStartTime : 0;
    }

    /// @notice Get public sale remaining time.
    function getRemainingSaleTime()
        external
        view
        isPublicSaleActive
        returns (uint256)
    {
        if (getElapsedSaleTime() >= publicSaleDuration) {
            return 0;
        }

        return (publicSaleStartTime + publicSaleDuration) - block.timestamp;
    }

    /// @notice Mint max 20 SPACE HELMETS for TX.
    /// @param quantity Quantity of SPACE HELMETS to mint.
    function MINT_SPACE_HELMETS(
        uint256 quantity
    ) external payable isPublicSaleActive {
        require(
            _totalMinted() + quantity <= MAX_SPACE_HELMETS_NFT,
            "Minting would exceed max supply"
        );
        require(quantity > 0, "Must mint at least one SPACE_HELMETS");
        require(
            quantity <= MAX_SPACE_HELMETS_PURCHASE,
            "Requested number exceeds maximum"
        );
        require(getElapsedSaleTime() <= publicSaleDuration, "Sale ended");
        uint256 costToMint = SPACE_HELMETS_SALE_PRICE * quantity;
        require(costToMint <= msg.value, "Ether value sent is not correct");

        _mint(msg.sender, quantity);
        refund(costToMint);
    }

    /// @notice Send back extra ETH to wallet
    function refund(uint256 price) private {
        require(msg.value >= price, "Need to send more ETH.");
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }

    // WITHDRAWALS
    /// @notice Execute ETH withdrawals from sales.
    function withdraw() external onlyOwner nonReentrant {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "ETH Transfer Failed");
    }

    /// @notice Execute ERC20 withdrawals from sales.
    /// to verify
    function withdrawTokens(IERC20 token) external onlyOwner nonReentrant{
        (bool success, ) = msg.sender.call{value: token.balanceOf(address(this))}("");
        require(success, "Token Transfer Failed");
    }


    // ROYALTIES
    /// @dev Set % royalties fee from sales see {ERC2981}.
    /// @param _receiver the address to send the fees if not owner.
    /// @param _royaltyFeesInBips fees % in bps.
    function setDefaultRoyalty(
        address _receiver,
        uint96 _royaltyFeesInBips
    ) external onlyOwner {
        _setDefaultRoyalty(_receiver, _royaltyFeesInBips);
    }

    // OPERATOR FILTER REGISTRY

    /// @dev See {IERC721-setApprovalForAll}.
    ///     In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    function setApprovalForAll(address operator, bool approved)
        public
        override
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    
    /// @dev See {IERC721-approve}.
    ///      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    function approve(address operator, uint256 tokenId)
        public
        payable
        override
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }


    /// @dev See {IERC721-transferFrom}.
    //       In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /// @dev See {IERC721-safeTransferFrom}.
    //       In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public payable override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    /// @dev See {IERC721-safeTransferFrom}.
    //       In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public payable override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /// @dev See {IERC165-supportsInterface}.
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721A, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
