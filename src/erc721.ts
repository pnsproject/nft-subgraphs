import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  IERC721,
  Transfer as TransferEvent,
} from "./types/erc721/IERC721";
import {
  Account,
  ERC721Contract,
  ERC721Operator,
  ERC721Token,
  ERC721Transfer,
  Transaction,
} from "./types/schema";

export function handleApproval(event: ApprovalEvent): void {
  let ev = new ERC721Token(tokenId(event.address, event.params.tokenId));
  ev.contract = fetchContract(event.address).id;
  ev.owner = fetchAccount(event.params.owner).id;
  ev.approval = fetchAccount(event.params.approved).id;
  ev.identifier = event.params.tokenId;
  let endpoint = IERC721.bind(event.address);
  ev.uri = endpoint.tokenURI(event.params.tokenId);
  ev.save();
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let ev = new ERC721Operator(eventId(event));
  ev.contract = fetchContract(event.address).id;
  ev.owner = fetchAccount(event.params.owner).id;
  ev.operator = fetchAccount(event.params.operator).id;
  ev.approved = event.params.approved;
  ev.save();
}

export function handleTransfer(event: TransferEvent): void {
  let ev = new ERC721Transfer(eventId(event));
  ev.emitter = fetchAccount(event.address).id;
  ev.transaction = fetchTransaction(event).id;
  ev.contract = fetchContract(event.address).id;
  ev.from = fetchAccount(event.params.from).id;
  ev.to = fetchAccount(event.params.to).id;
  ev.token = fetchToken(
    tokenId(event.address, event.params.tokenId),
    ev.to,
    ev.contract,
    event.params.tokenId
  ).id;
  ev.save();
}

function eventId(event: ethereum.Event): string {
  return event.block.number
    .toString()
    .concat("-")
    .concat(event.logIndex.toString());
}

function tokenId(contractAddress: Address, tokenId: BigInt): string {
  return contractAddress
    .toString()
    .concat("-")
    .concat(tokenId.toHexString());
}

function fetchAccount(address: Address): Account {
  let account = new Account(address);
  account.save();
  return account;
}

function fetchTransaction(event: ethereum.Event): Transaction {
  let tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number;
  tx.save();
  return tx as Transaction;
}

function fetchToken(
  tokenId: string,
  owner: Bytes,
  contract: Bytes,
  identifier: BigInt
): ERC721Token {
  let token = new ERC721Token(tokenId);

  if (token.contract == null) {
    token.contract = contract;
  }

  if (token.identifier == null) {
    token.identifier = identifier;
  }

  token.owner = owner;
  token.save();

  return token as ERC721Token;
}

export function fetchContract(address: Address): ERC721Contract {
  let account = fetchAccount(address);
  let contract = ERC721Contract.load(account.id);

  if (contract == null) {
    let endpoint = IERC721.bind(address);
    contract = new ERC721Contract(account.id);
    contract.name = endpoint.name();
    contract.symbol = endpoint.symbol();
    // interfaceId
    // ERC165               0x01ffc9a7
    // ERC721               0x80ac58cd
    // ERC721Metadata       0x5b5e139f
    // ERC721TokenReceiver  0x150b7a02
    // ERC721Enumerable     0x780e9d63
    // AccessControl        0x7965db0b
    contract.supportsMetadata = endpoint.supportsInterface(
      Bytes.fromHexString("0x5b5e139f")
    );
    contract.asAccount = account.id;
    account.asERC721 = contract.id;
    contract.save();
    account.save();
  }

  return contract as ERC721Contract;
}
