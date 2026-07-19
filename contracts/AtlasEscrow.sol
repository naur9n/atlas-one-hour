// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Minimal ERC-20 job escrow prototype inspired by agentic-commerce flows.
 * TESTNET PROTOTYPE ONLY. Not audited.
 */
contract AtlasEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { None, Funded, Submitted, Completed, Rejected, Refunded }

    struct Job {
        address client;
        address provider;
        address evaluator;
        uint128 budget;
        uint64 deadline;
        Status status;
        bytes32 specHash;
        bytes32 resultHash;
    }

    IERC20 public immutable paymentToken;
    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed provider,
        address evaluator,
        uint256 budget,
        uint256 deadline,
        bytes32 specHash
    );
    event JobSubmitted(uint256 indexed jobId, bytes32 resultHash);
    event JobCompleted(uint256 indexed jobId);
    event JobRejected(uint256 indexed jobId);
    event JobRefunded(uint256 indexed jobId);

    constructor(IERC20 token) {
        require(address(token) != address(0), "zero token");
        paymentToken = token;
    }

    function createJob(
        address provider,
        address evaluator,
        uint128 budget,
        uint64 deadline,
        bytes32 specHash
    ) external nonReentrant returns (uint256 jobId) {
        require(provider != address(0) && evaluator != address(0), "zero party");
        require(budget > 0, "zero budget");
        require(deadline > block.timestamp, "bad deadline");

        jobId = nextJobId++;
        jobs[jobId] = Job({
            client: msg.sender,
            provider: provider,
            evaluator: evaluator,
            budget: budget,
            deadline: deadline,
            status: Status.Funded,
            specHash: specHash,
            resultHash: bytes32(0)
        });

        paymentToken.safeTransferFrom(msg.sender, address(this), budget);
        emit JobCreated(jobId, msg.sender, provider, evaluator, budget, deadline, specHash);
    }

    function submit(uint256 jobId, bytes32 resultHash) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.provider, "not provider");
        require(job.status == Status.Funded, "wrong status");
        require(block.timestamp <= job.deadline, "expired");
        require(resultHash != bytes32(0), "empty result");

        job.resultHash = resultHash;
        job.status = Status.Submitted;
        emit JobSubmitted(jobId, resultHash);
    }

    function complete(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(msg.sender == job.evaluator, "not evaluator");
        require(job.status == Status.Submitted, "wrong status");

        job.status = Status.Completed;
        paymentToken.safeTransfer(job.provider, job.budget);
        emit JobCompleted(jobId);
    }

    function reject(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(msg.sender == job.evaluator, "not evaluator");
        require(job.status == Status.Submitted, "wrong status");

        job.status = Status.Rejected;
        paymentToken.safeTransfer(job.client, job.budget);
        emit JobRejected(jobId);
    }

    function refundExpired(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "not client");
        require(job.status == Status.Funded, "wrong status");
        require(block.timestamp > job.deadline, "not expired");

        job.status = Status.Refunded;
        paymentToken.safeTransfer(job.client, job.budget);
        emit JobRefunded(jobId);
    }
}
