// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/**
 * TESTNET PROTOTYPE ONLY.
 * Fixed supply. No owner mint, blacklist, tax, or hidden transfer logic.
 */
contract AtlasToken is ERC20, ERC20Capped {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;

    constructor(address treasury)
        ERC20("Atlas", "ATLAS")
        ERC20Capped(MAX_SUPPLY)
    {
        require(treasury != address(0), "zero treasury");
        _mint(treasury, MAX_SUPPLY);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
