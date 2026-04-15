"""ArcPay client — USDC payments on Arc Network."""
from decimal import Decimal
from typing import Optional, Union

from web3 import Web3
from eth_account import Account

from .networks import NetworkConfig, NETWORKS
from .abis import (
    REGISTRY_ABI, TIPJAR_ABI, SUBSCRIPTIONS_ABI,
    CONTENT_PAYWALL_ABI, PAYPERCALL_ABI,
)


def _to_wei(amount: Union[str, int, Decimal]) -> int:
    """Convert USDC amount (e.g., '0.005') to wei (18 decimals on Arc native)."""
    if isinstance(amount, int):
        return amount
    return int(Decimal(str(amount)) * Decimal(10**18))


class ArcPayClient:
    """Top-level ArcPay client. Supports read methods anonymously; write methods require private_key."""

    def __init__(
        self,
        network: str = "local",
        private_key: Optional[str] = None,
        config: Optional[NetworkConfig] = None,
        rpc_url: Optional[str] = None,
    ):
        self.config = config or NETWORKS[network]
        self.w3 = Web3(Web3.HTTPProvider(rpc_url or self.config.rpc_url))
        if private_key:
            self.account = Account.from_key(private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = None

        addr = self.config.addresses
        self._registry = self.w3.eth.contract(address=Web3.to_checksum_address(addr["registry"]), abi=REGISTRY_ABI)
        self._tipjar = self.w3.eth.contract(address=Web3.to_checksum_address(addr["tipJar"]), abi=TIPJAR_ABI)
        self._subs = self.w3.eth.contract(address=Web3.to_checksum_address(addr["subscriptions"]), abi=SUBSCRIPTIONS_ABI)
        self._paywall = self.w3.eth.contract(address=Web3.to_checksum_address(addr["contentPaywall"]), abi=CONTENT_PAYWALL_ABI)
        self._api = self.w3.eth.contract(address=Web3.to_checksum_address(addr["payPerCall"]), abi=PAYPERCALL_ABI)

        self.registry = RegistryAPI(self)
        self.tips = TipsAPI(self)
        self.subs = SubscriptionsAPI(self)
        self.paywall = PaywallAPI(self)
        self.api = PayPerCallAPI(self)

    def _require_signer(self):
        if not self.account:
            raise RuntimeError("Write call requires private_key in ArcPayClient(...)")

    def _send(self, fn, value: int = 0) -> str:
        """Build, sign, and send a tx. Returns tx hash."""
        self._require_signer()
        nonce = self.w3.eth.get_transaction_count(self.account.address)
        tx = fn.build_transaction({
            "from": self.account.address,
            "value": value,
            "nonce": nonce,
            "chainId": self.config.chain_id,
        })
        # Estimate gas if not set
        if "gas" not in tx:
            tx["gas"] = self.w3.eth.estimate_gas(tx)
        # gasPrice or EIP-1559
        if "maxFeePerGas" not in tx and "gasPrice" not in tx:
            tx["gasPrice"] = self.w3.eth.gas_price
        signed = self.account.sign_transaction(tx)
        h = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(h)
        return receipt.transactionHash.hex()


# ─── Module APIs ─────────────────────────────────────────────────

class RegistryAPI:
    def __init__(self, client: ArcPayClient):
        self.c = client

    def register(self, username: str, display_name: str = "", metadata_uri: str = "") -> str:
        fn = self.c._registry.functions.register(username, display_name, metadata_uri)
        return self.c._send(fn)

    def exists(self, username: str) -> bool:
        return self.c._registry.functions.exists(username).call()

    def get_payout_address(self, username: str) -> str:
        return self.c._registry.functions.getPayoutAddress(username).call()

    def get_creator(self, username: str):
        return self.c._registry.functions.getCreator(username).call()


class TipsAPI:
    def __init__(self, client: ArcPayClient):
        self.c = client

    def send(self, username: str, amount: Union[str, int, Decimal], message: str = "") -> str:
        wei = _to_wei(amount)
        fn = self.c._tipjar.functions.tip(username, message)
        return self.c._send(fn, value=wei)

    def send_to_address(self, recipient: str, amount: Union[str, int, Decimal], message: str = "") -> str:
        wei = _to_wei(amount)
        fn = self.c._tipjar.functions.tipAddress(Web3.to_checksum_address(recipient), message)
        return self.c._send(fn, value=wei)

    def get_lifetime_received(self, username: str) -> int:
        return self.c._tipjar.functions.getLifetimeReceived(username).call()

    def get_tips_by_creator(self, username: str) -> list:
        return self.c._tipjar.functions.getTipsByCreator(username).call()


class SubscriptionsAPI:
    def __init__(self, client: ArcPayClient):
        self.c = client

    def create_plan(self, username: str, name: str, price_per_month: Union[str, int, Decimal], metadata_uri: str = "") -> str:
        wei = _to_wei(price_per_month)
        fn = self.c._subs.functions.createPlan(username, name, wei, metadata_uri)
        return self.c._send(fn)

    def subscribe(self, plan_id: int, months: int) -> str:
        plan = self.get_plan(plan_id)
        total = plan[2] * months  # pricePerMonth * months
        fn = self.c._subs.functions.subscribe(plan_id, months)
        return self.c._send(fn, value=total)

    def cancel(self, sub_id: int) -> str:
        return self.c._send(self.c._subs.functions.cancel(sub_id))

    def withdraw(self, username: str) -> str:
        return self.c._send(self.c._subs.functions.withdraw(username))

    def is_active(self, subscriber: str, plan_id: int) -> bool:
        return self.c._subs.functions.isActive(Web3.to_checksum_address(subscriber), plan_id).call()

    def get_plan(self, plan_id: int):
        return self.c._subs.functions.getPlan(plan_id).call()


class PaywallAPI:
    def __init__(self, client: ArcPayClient):
        self.c = client

    def create_content(self, username: str, content_id: bytes, price: Union[str, int, Decimal], metadata_uri: str = "") -> str:
        wei = _to_wei(price)
        if isinstance(content_id, str) and content_id.startswith("0x"):
            content_id = bytes.fromhex(content_id[2:])
        fn = self.c._paywall.functions.createContent(username, content_id, wei, metadata_uri)
        return self.c._send(fn)

    def purchase(self, content_id: bytes, price_wei: int) -> str:
        if isinstance(content_id, str) and content_id.startswith("0x"):
            content_id = bytes.fromhex(content_id[2:])
        fn = self.c._paywall.functions.purchase(content_id)
        return self.c._send(fn, value=price_wei)

    def check_access(self, content_id: bytes, user: str) -> bool:
        if isinstance(content_id, str) and content_id.startswith("0x"):
            content_id = bytes.fromhex(content_id[2:])
        return self.c._paywall.functions.checkAccess(content_id, Web3.to_checksum_address(user)).call()


class PayPerCallAPI:
    def __init__(self, client: ArcPayClient):
        self.c = client

    def register_endpoint(self, username: str, name: str, price_per_call: Union[str, int, Decimal]) -> str:
        wei = _to_wei(price_per_call)
        fn = self.c._api.functions.registerEndpoint(username, name, wei)
        return self.c._send(fn)

    def pay(self, username: str, endpoint_name: str, amount_wei: int) -> str:
        fn = self.c._api.functions.payByName(username, endpoint_name)
        return self.c._send(fn, value=amount_wei)

    def get_endpoint_by_name(self, username: str, name: str):
        return self.c._api.functions.getEndpointByName(username, name).call()

    def get_receipt(self, call_id: int):
        return self.c._api.functions.getReceipt(call_id).call()
