#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default installation directory
INSTALL_DIR="${HOME}/.local/share/unifi-network-mcp"
CLAUDE_SETTINGS="${HOME}/.claude.json"

# Handle piped input (curl | bash) - use /dev/tty for prompts
if [ -t 0 ]; then
    INPUT_DEVICE="/dev/stdin"
else
    INPUT_DEVICE="/dev/tty"
fi

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════╗"
    echo "║   UniFi Network MCP Server Installer  ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

check_dependencies() {
    print_info "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi

    print_success "All dependencies found"
}

clone_or_update_repo() {
    if [ -d "$INSTALL_DIR" ]; then
        print_info "Updating existing installation..."
        cd "$INSTALL_DIR"
        git pull origin master
    else
        print_info "Cloning repository..."
        git clone https://github.com/Ruashots/unifi-network-mcp.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    print_success "Repository ready"
}

install_and_build() {
    print_info "Installing dependencies..."
    npm install --silent

    print_info "Building..."
    npm run build --silent

    print_success "Build complete"
}

configure_credentials() {
    echo ""
    echo -e "${BLUE}Configuration${NC}"
    echo "─────────────────────────────────────────"

    # Get existing values if reconfiguring
    local existing_url=""
    local existing_key=""

    if [ -f "$CLAUDE_SETTINGS" ]; then
        existing_url=$(jq -r '.mcpServers."unifi-network".env.UNIFI_BASE_URL // empty' "$CLAUDE_SETTINGS" 2>/dev/null || true)
        existing_key=$(jq -r '.mcpServers."unifi-network".env.UNIFI_API_KEY // empty' "$CLAUDE_SETTINGS" 2>/dev/null || true)
    fi

    # Prompt for UniFi Console URL
    if [ -n "$existing_url" ]; then
        read -p "UniFi Console URL [$existing_url]: " UNIFI_URL < "$INPUT_DEVICE"
        UNIFI_URL="${UNIFI_URL:-$existing_url}"
    else
        read -p "UniFi Console URL (e.g., https://192.168.1.1): " UNIFI_URL < "$INPUT_DEVICE"
    fi

    if [ -z "$UNIFI_URL" ]; then
        print_error "UniFi Console URL is required"
        exit 1
    fi

    # Prompt for API key
    if [ -n "$existing_key" ]; then
        read -p "API Key [keep existing]: " UNIFI_KEY < "$INPUT_DEVICE"
        UNIFI_KEY="${UNIFI_KEY:-$existing_key}"
    else
        read -p "API Key (from UniFi Console > Profile > API): " UNIFI_KEY < "$INPUT_DEVICE"
    fi

    if [ -z "$UNIFI_KEY" ]; then
        print_error "API Key is required"
        exit 1
    fi

    print_success "Configuration saved"
}

update_claude_settings() {
    print_info "Configuring Claude Code..."

    # Create settings file if it doesn't exist
    if [ ! -f "$CLAUDE_SETTINGS" ]; then
        echo '{}' > "$CLAUDE_SETTINGS"
    fi

    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install jq and run again, or manually configure Claude Code."
        echo ""
        echo "Manual configuration - add to $CLAUDE_SETTINGS:"
        echo ""
        cat << EOF
{
  "mcpServers": {
    "unifi-network": {
      "command": "node",
      "args": ["$INSTALL_DIR/dist/index.js"],
      "env": {
        "UNIFI_BASE_URL": "$UNIFI_URL",
        "UNIFI_API_KEY": "$UNIFI_KEY"
      }
    }
  }
}
EOF
        exit 1
    fi

    # Update settings using jq
    local tmp_file=$(mktemp)
    jq --arg dir "$INSTALL_DIR" \
       --arg url "$UNIFI_URL" \
       --arg key "$UNIFI_KEY" \
       '.mcpServers."unifi-network" = {
          "command": "node",
          "args": [($dir + "/dist/index.js")],
          "env": {
            "UNIFI_BASE_URL": $url,
            "UNIFI_API_KEY": $key
          }
        }' "$CLAUDE_SETTINGS" > "$tmp_file" && mv "$tmp_file" "$CLAUDE_SETTINGS"

    print_success "Claude Code configured"
}

test_connection() {
    print_info "Testing connection to UniFi Console..."

    local response=$(curl -sk -o /dev/null -w "%{http_code}" \
        -H "X-API-KEY: $UNIFI_KEY" \
        "$UNIFI_URL/proxy/network/integration/v1/info" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        print_success "Connection successful"
    else
        print_error "Connection failed (HTTP $response). Please check your URL and API key."
        echo "  You can reconfigure later with: install.sh --reconfigure"
    fi
}

print_completion() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart Claude Code"
    echo "  2. Run /mcp to verify the unifi-network server is connected"
    echo "  3. Try: 'list my UniFi sites'"
    echo ""
    echo "Commands:"
    echo "  Reconfigure:  $0 --reconfigure"
    echo "  Uninstall:    rm -rf $INSTALL_DIR"
    echo ""
}

show_help() {
    echo "UniFi Network MCP Server Installer"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h        Show this help message"
    echo "  --reconfigure     Reconfigure credentials only (skip install)"
    echo "  --uninstall       Remove the installation"
    echo ""
}

uninstall() {
    print_info "Uninstalling UniFi Network MCP Server..."

    # Remove installation directory
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        print_success "Removed $INSTALL_DIR"
    fi

    # Remove from Claude settings
    if [ -f "$CLAUDE_SETTINGS" ] && command -v jq &> /dev/null; then
        local tmp_file=$(mktemp)
        jq 'del(.mcpServers."unifi-network")' "$CLAUDE_SETTINGS" > "$tmp_file" && mv "$tmp_file" "$CLAUDE_SETTINGS"
        print_success "Removed from Claude Code settings"
    fi

    echo ""
    print_success "Uninstallation complete. Restart Claude Code."
}

# Main script
main() {
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --reconfigure)
            print_banner
            INSTALL_DIR="${HOME}/.local/share/unifi-network-mcp"
            configure_credentials
            update_claude_settings
            test_connection
            echo ""
            print_success "Reconfiguration complete. Restart Claude Code."
            exit 0
            ;;
        --uninstall)
            uninstall
            exit 0
            ;;
    esac

    print_banner
    check_dependencies
    clone_or_update_repo
    install_and_build
    configure_credentials
    update_claude_settings
    test_connection
    print_completion
}

main "$@"
