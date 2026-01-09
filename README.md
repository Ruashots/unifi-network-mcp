# UniFi Network MCP Server

A Model Context Protocol (MCP) server for the [UniFi Network API](https://developer.ui.com/). Manage your UniFi network infrastructure through AI assistants like Claude.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/Ruashots/unifi-network-mcp/master/install.sh | bash
```

This will:
- Clone the repository to `~/.local/share/unifi-network-mcp`
- Install dependencies and build
- Prompt for your UniFi Console URL and API key
- Configure Claude Code automatically

**Other commands:**
```bash
# Reconfigure credentials
~/.local/share/unifi-network-mcp/install.sh --reconfigure

# Uninstall
~/.local/share/unifi-network-mcp/install.sh --uninstall
```

## Features

**50+ tools** covering the complete UniFi Network API:

- **Sites** - List all sites accessible to the API key
- **Devices** - List, get statistics, adopt, restart, locate devices
- **Clients** - View connected clients, authorize guest access
- **Networks** - Full CRUD for network configurations
- **WiFi** - Create and manage SSIDs with security settings
- **Hotspot Vouchers** - Generate and manage guest vouchers
- **Firewall Zones** - Organize networks into security zones
- **ACL Rules** - Create and manage firewall rules with scheduling
- **Traffic Matching Lists** - IP groups, port groups, domains, apps, regions

## Prerequisites

- Node.js 18+
- UniFi Console with Network application (UniFi OS Console, Cloud Key, or self-hosted)
- UniFi API key (Site Admin or Super Admin role)
- `jq` (for automatic Claude Code configuration)

## Getting a UniFi API Key

1. Log into your UniFi Console
2. Click your profile icon (bottom left)
3. Go to **API** section
4. Click **Create API Key**
5. Copy the key (only shown once)

> **Note:** Your API key inherits your user permissions. Use a Site Admin or Super Admin account for full access.

## Manual Installation

```bash
# Clone the repository
git clone https://github.com/Ruashots/unifi-network-mcp.git
cd unifi-network-mcp

# Install dependencies
npm install

# Build
npm run build
```

## Usage

### Claude Code CLI

```bash
claude mcp add unifi-network \
  --transport stdio \
  -e UNIFI_API_KEY="your-api-key" \
  -e UNIFI_BASE_URL="https://your-console-ip" \
  -- node /path/to/unifi-network-mcp/dist/index.js
```

**Scope options:**

| Flag | Description |
|------|-------------|
| *(default)* | Local to current directory |
| `--scope user` | Available across all your projects |
| `--scope project` | Shared with team via `.mcp.json` |

### Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unifi-network": {
      "command": "node",
      "args": ["/path/to/unifi-network-mcp/dist/index.js"],
      "env": {
        "UNIFI_API_KEY": "your-api-key",
        "UNIFI_BASE_URL": "https://your-console-ip"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `UNIFI_BASE_URL` | Your UniFi Console URL (e.g., `https://192.168.1.1`) |
| `UNIFI_API_KEY` | API key from your UniFi Console |

## Available Tools

### Application
| Tool | Description |
|------|-------------|
| `unifi_get_info` | Get application version and type |

### Sites
| Tool | Description |
|------|-------------|
| `unifi_list_sites` | List all sites |

### Devices
| Tool | Description |
|------|-------------|
| `unifi_list_devices` | List all devices at a site |
| `unifi_get_device` | Get device details |
| `unifi_get_device_statistics` | Get latest device statistics |
| `unifi_adopt_device` | Adopt a pending device |
| `unifi_restart_device` | Restart a device |
| `unifi_locate_device` | Flash device LED |
| `unifi_list_pending_devices` | List devices pending adoption |

### Clients
| Tool | Description |
|------|-------------|
| `unifi_list_clients` | List all connected clients |
| `unifi_get_client` | Get client details |
| `unifi_authorize_guest` | Authorize guest on hotspot |

### Networks
| Tool | Description |
|------|-------------|
| `unifi_list_networks` | List all networks |
| `unifi_get_network` | Get network details |
| `unifi_create_network` | Create a network |
| `unifi_update_network` | Update a network |
| `unifi_delete_network` | Delete a network |

### WiFi
| Tool | Description |
|------|-------------|
| `unifi_list_wifi` | List all WiFi networks (SSIDs) |
| `unifi_get_wifi` | Get WiFi network details |
| `unifi_create_wifi` | Create WiFi network |
| `unifi_update_wifi` | Update WiFi network |
| `unifi_delete_wifi` | Delete WiFi network |

### Hotspot Vouchers
| Tool | Description |
|------|-------------|
| `unifi_list_vouchers` | List all vouchers |
| `unifi_get_voucher` | Get voucher details |
| `unifi_create_voucher` | Create vouchers |
| `unifi_update_voucher` | Update voucher |
| `unifi_delete_voucher` | Delete voucher |

### Firewall Zones
| Tool | Description |
|------|-------------|
| `unifi_list_firewall_zones` | List firewall zones |
| `unifi_get_firewall_zone` | Get zone details |
| `unifi_create_firewall_zone` | Create zone |
| `unifi_update_firewall_zone` | Update zone |
| `unifi_delete_firewall_zone` | Delete zone |

### ACL Rules (Firewall)
| Tool | Description |
|------|-------------|
| `unifi_list_acl_rules` | List all ACL rules |
| `unifi_get_acl_rule` | Get rule details |
| `unifi_create_acl_rule` | Create ACL rule |
| `unifi_update_acl_rule` | Update ACL rule |
| `unifi_delete_acl_rule` | Delete ACL rule |
| `unifi_batch_update_acl_rules` | Batch update rules |

### Traffic Matching Lists
| Tool | Description |
|------|-------------|
| `unifi_list_traffic_matching_lists` | List all matching lists |
| `unifi_get_traffic_matching_list` | Get list details |
| `unifi_create_traffic_matching_list` | Create matching list |
| `unifi_update_traffic_matching_list` | Update matching list |
| `unifi_delete_traffic_matching_list` | Delete matching list |

### Supporting Resources
| Tool | Description |
|------|-------------|
| `unifi_list_wans` | List WAN interfaces |
| `unifi_list_vpns` | List VPN configurations |
| `unifi_list_radius_profiles` | List RADIUS profiles |
| `unifi_get_system_log` | Get system log entries |
| `unifi_list_dpi_categories` | List DPI categories |
| `unifi_list_dpi_applications` | List DPI applications |
| `unifi_list_countries` | List countries for geo rules |

## Example Prompts

Once configured, use natural language:

```
"List all my UniFi sites"

"What devices are connected to my network?"

"Create a guest WiFi network with WPA3 security"

"Show me which clients are currently connected"

"Create 10 hotspot vouchers valid for 24 hours"

"Block traffic from the IoT network to the main network"

"Restart the access point in the living room"

"What's the current status of my UDM Pro?"
```

## Development

```bash
npm install      # Install dependencies
npm run dev      # Run in development mode
npm run build    # Build for production
npm run watch    # Watch mode
```

## API Endpoint

The MCP server connects to the UniFi Network Integration API at:
```
{UNIFI_BASE_URL}/proxy/network/integration/v1/...
```

This is the official public API introduced in UniFi Network 9.0+.

## Security

- Keep API keys secure and never commit them to version control
- Use environment variables for sensitive configuration
- API keys inherit user permissions - use least privilege principle
- Consider creating a dedicated API user for automation

## License

MIT

## Links

- [UniFi Developer Portal](https://developer.ui.com/)
- [UniFi Network API Documentation](https://developer.ui.com/unifi-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
