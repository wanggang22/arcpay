#!/bin/bash
# Deploy all ArcPay contracts.
# Usage: RPC=... PK=... FEE_RECIPIENT=... bash deploy.sh
set -e
export PATH="$HOME/.cargo/bin:$HOME/.foundry/bin:$PATH"

RPC=${RPC:-http://localhost:8545}
PK=${PK:?set PK}
FEE_RECIPIENT=${FEE_RECIPIENT:-$(cast wallet address --private-key $PK)}
FEE_BPS=${FEE_BPS:-200}  # 2% default

echo "Deploying ArcPay to $RPC"
echo "Deployer fee recipient: $FEE_RECIPIENT"
echo ""

cd "$(dirname "$0")/.."

deploy() {
  local contract=$1
  local args=$2
  local RESULT
  if [ -z "$args" ]; then
    RESULT=$(forge create "src/$contract.sol:$contract" --rpc-url $RPC --private-key $PK --broadcast 2>&1)
  else
    RESULT=$(forge create "src/$contract.sol:$contract" --rpc-url $RPC --private-key $PK --broadcast --constructor-args $args 2>&1)
  fi
  local ADDR=$(echo "$RESULT" | grep -oE "Deployed to: 0x[a-fA-F0-9]+" | awk '{print $3}')
  if [ -z "$ADDR" ]; then
    echo "❌ $contract failed:"
    echo "$RESULT" | tail -10
    exit 1
  fi
  echo "  $contract: $ADDR"
  echo $ADDR
}

echo "1/6 UsernameRegistry"
REG=$(deploy UsernameRegistry | tail -1)

echo "2/6 TipJar"
TIP=$(deploy TipJar "$REG $FEE_BPS $FEE_RECIPIENT" | tail -1)

echo "3/6 Subscriptions"
SUB=$(deploy Subscriptions "$REG $FEE_BPS $FEE_RECIPIENT" | tail -1)

echo "4/6 ContentPaywall"
CONTENT=$(deploy ContentPaywall "$REG $FEE_BPS $FEE_RECIPIENT" | tail -1)

echo "5/6 PayPerCall"
API=$(deploy PayPerCall "$REG $FEE_BPS $FEE_RECIPIENT" | tail -1)

echo "6/6 ArcPayHub"
HUB=$(deploy ArcPayHub "$REG $TIP $SUB $CONTENT $API" | tail -1)

echo ""
echo "========================================="
echo "ArcPay Deployment — $RPC"
echo "========================================="
echo "UsernameRegistry: $REG"
echo "TipJar:           $TIP"
echo "Subscriptions:    $SUB"
echo "ContentPaywall:   $CONTENT"
echo "PayPerCall:       $API"
echo "ArcPayHub:        $HUB"
echo "========================================="

# Write deployment record
mkdir -p deployments
OUTFILE=deployments/$(date +%Y%m%d_%H%M%S).json
cat > $OUTFILE <<EOF
{
  "rpc": "$RPC",
  "timestamp": "$(date -Iseconds)",
  "protocolFeeBps": $FEE_BPS,
  "feeRecipient": "$FEE_RECIPIENT",
  "contracts": {
    "UsernameRegistry": "$REG",
    "TipJar": "$TIP",
    "Subscriptions": "$SUB",
    "ContentPaywall": "$CONTENT",
    "PayPerCall": "$API",
    "ArcPayHub": "$HUB"
  }
}
EOF
echo "Saved → $OUTFILE"
