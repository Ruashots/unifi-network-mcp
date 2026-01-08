#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment variables
const UNIFI_BASE_URL = process.env.UNIFI_BASE_URL || "";
const UNIFI_API_KEY = process.env.UNIFI_API_KEY || "";

if (!UNIFI_BASE_URL || !UNIFI_API_KEY) {
  console.error("Error: UNIFI_BASE_URL and UNIFI_API_KEY environment variables are required");
  process.exit(1);
}

// Helper function to make UniFi API requests
async function unifiRequest(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${UNIFI_BASE_URL}/proxy/network/integration${endpoint}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "X-API-KEY": UNIFI_API_KEY,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UniFi API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Create the MCP server
const server = new Server(
  {
    name: "unifi-network-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ============================================
      // APPLICATION INFO
      // ============================================
      {
        name: "unifi_get_info",
        description: "Get application information including version and whether it's a UniFi OS Console",
        inputSchema: { type: "object", properties: {}, required: [] },
      },

      // ============================================
      // SITES
      // ============================================
      {
        name: "unifi_list_sites",
        description: "List all sites available to the API key",
        inputSchema: { type: "object", properties: {}, required: [] },
      },

      // ============================================
      // DEVICES
      // ============================================
      {
        name: "unifi_list_devices",
        description: "List all devices at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_device",
        description: "Get a specific device by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_get_device_statistics",
        description: "Get latest statistics for a device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_adopt_device",
        description: "Adopt a pending device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_restart_device",
        description: "Restart a device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
          },
          required: ["siteId", "deviceId"],
        },
      },
      {
        name: "unifi_locate_device",
        description: "Enable or disable the locate function (flashing LED) on a device",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
            enabled: { type: "boolean", description: "Enable or disable locate mode" },
          },
          required: ["siteId", "deviceId", "enabled"],
        },
      },
      {
        name: "unifi_list_pending_devices",
        description: "List devices pending adoption at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },

      // ============================================
      // CLIENTS
      // ============================================
      {
        name: "unifi_list_clients",
        description: "List all clients (connected devices/users) at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_client",
        description: "Get a specific client by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            clientId: { type: "string", description: "Client ID" },
          },
          required: ["siteId", "clientId"],
        },
      },
      {
        name: "unifi_authorize_guest",
        description: "Authorize a guest client on a hotspot network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            clientId: { type: "string", description: "Client ID" },
            expiresAt: { type: "string", description: "ISO 8601 timestamp when authorization expires" },
            usageQuota: {
              type: "object",
              description: "Optional usage limits",
              properties: {
                dataTx: { type: "number", description: "Upload limit in bytes" },
                dataRx: { type: "number", description: "Download limit in bytes" },
                dataTotal: { type: "number", description: "Total data limit in bytes" },
              },
            },
          },
          required: ["siteId", "clientId", "expiresAt"],
        },
      },

      // ============================================
      // NETWORKS
      // ============================================
      {
        name: "unifi_list_networks",
        description: "List all networks at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_network",
        description: "Get a specific network by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            networkId: { type: "string", description: "Network ID" },
          },
          required: ["siteId", "networkId"],
        },
      },
      {
        name: "unifi_create_network",
        description: "Create a new network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "Network name" },
            purpose: { type: "string", enum: ["corporate", "guest", "wan", "vlan-only"], description: "Network purpose" },
            vlanId: { type: "number", description: "VLAN ID (1-4094)" },
            dhcpEnabled: { type: "boolean", description: "Enable DHCP server" },
            dhcpStart: { type: "string", description: "DHCP range start IP" },
            dhcpStop: { type: "string", description: "DHCP range end IP" },
            gateway: { type: "string", description: "Gateway IP address" },
            subnet: { type: "string", description: "Subnet in CIDR notation (e.g., 192.168.1.0/24)" },
            domainName: { type: "string", description: "Domain name for the network" },
            internetAccessEnabled: { type: "boolean", description: "Allow internet access" },
          },
          required: ["siteId", "name", "purpose"],
        },
      },
      {
        name: "unifi_update_network",
        description: "Update an existing network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            networkId: { type: "string", description: "Network ID" },
            name: { type: "string", description: "Network name" },
            purpose: { type: "string", enum: ["corporate", "guest", "wan", "vlan-only"], description: "Network purpose" },
            vlanId: { type: "number", description: "VLAN ID (1-4094)" },
            dhcpEnabled: { type: "boolean", description: "Enable DHCP server" },
            dhcpStart: { type: "string", description: "DHCP range start IP" },
            dhcpStop: { type: "string", description: "DHCP range end IP" },
            gateway: { type: "string", description: "Gateway IP address" },
            subnet: { type: "string", description: "Subnet in CIDR notation" },
            domainName: { type: "string", description: "Domain name for the network" },
            internetAccessEnabled: { type: "boolean", description: "Allow internet access" },
          },
          required: ["siteId", "networkId"],
        },
      },
      {
        name: "unifi_delete_network",
        description: "Delete a network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            networkId: { type: "string", description: "Network ID" },
          },
          required: ["siteId", "networkId"],
        },
      },

      // ============================================
      // WIFI
      // ============================================
      {
        name: "unifi_list_wifi",
        description: "List all WiFi networks (SSIDs) at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_wifi",
        description: "Get a specific WiFi network by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            wifiId: { type: "string", description: "WiFi network ID" },
          },
          required: ["siteId", "wifiId"],
        },
      },
      {
        name: "unifi_create_wifi",
        description: "Create a new WiFi network (SSID)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "SSID name" },
            enabled: { type: "boolean", description: "Enable the WiFi network" },
            security: { type: "string", enum: ["open", "wpa2", "wpa3", "wpa2wpa3"], description: "Security protocol" },
            password: { type: "string", description: "WiFi password (required for WPA)" },
            networkId: { type: "string", description: "Associated network ID" },
            hideSsid: { type: "boolean", description: "Hide the SSID from broadcast" },
            band: { type: "string", enum: ["2.4GHz", "5GHz", "both"], description: "Radio band" },
            bandSteeringEnabled: { type: "boolean", description: "Enable band steering" },
            wpa3TransitionMode: { type: "boolean", description: "Enable WPA3 transition mode" },
            pmfMode: { type: "string", enum: ["disabled", "optional", "required"], description: "Protected Management Frames mode" },
          },
          required: ["siteId", "name", "security", "networkId"],
        },
      },
      {
        name: "unifi_update_wifi",
        description: "Update an existing WiFi network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            wifiId: { type: "string", description: "WiFi network ID" },
            name: { type: "string", description: "SSID name" },
            enabled: { type: "boolean", description: "Enable the WiFi network" },
            security: { type: "string", enum: ["open", "wpa2", "wpa3", "wpa2wpa3"], description: "Security protocol" },
            password: { type: "string", description: "WiFi password" },
            networkId: { type: "string", description: "Associated network ID" },
            hideSsid: { type: "boolean", description: "Hide the SSID from broadcast" },
            band: { type: "string", enum: ["2.4GHz", "5GHz", "both"], description: "Radio band" },
            bandSteeringEnabled: { type: "boolean", description: "Enable band steering" },
          },
          required: ["siteId", "wifiId"],
        },
      },
      {
        name: "unifi_delete_wifi",
        description: "Delete a WiFi network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            wifiId: { type: "string", description: "WiFi network ID" },
          },
          required: ["siteId", "wifiId"],
        },
      },

      // ============================================
      // HOTSPOT VOUCHERS
      // ============================================
      {
        name: "unifi_list_vouchers",
        description: "List all hotspot vouchers at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_voucher",
        description: "Get a specific hotspot voucher by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            voucherId: { type: "string", description: "Voucher ID" },
          },
          required: ["siteId", "voucherId"],
        },
      },
      {
        name: "unifi_create_voucher",
        description: "Create hotspot vouchers",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            count: { type: "number", description: "Number of vouchers to create" },
            duration: { type: "number", description: "Duration in minutes" },
            usageQuota: {
              type: "object",
              description: "Optional usage limits",
              properties: {
                dataTx: { type: "number", description: "Upload limit in bytes" },
                dataRx: { type: "number", description: "Download limit in bytes" },
                dataTotal: { type: "number", description: "Total data limit in bytes" },
              },
            },
            multiUse: { type: "boolean", description: "Allow multiple uses" },
            maxUses: { type: "number", description: "Maximum number of uses (if multiUse is true)" },
            note: { type: "string", description: "Note/description for the vouchers" },
          },
          required: ["siteId", "count", "duration"],
        },
      },
      {
        name: "unifi_update_voucher",
        description: "Update a hotspot voucher",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            voucherId: { type: "string", description: "Voucher ID" },
            note: { type: "string", description: "Note/description for the voucher" },
          },
          required: ["siteId", "voucherId"],
        },
      },
      {
        name: "unifi_delete_voucher",
        description: "Delete a hotspot voucher",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            voucherId: { type: "string", description: "Voucher ID" },
          },
          required: ["siteId", "voucherId"],
        },
      },

      // ============================================
      // FIREWALL ZONES
      // ============================================
      {
        name: "unifi_list_firewall_zones",
        description: "List all firewall zones at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_firewall_zone",
        description: "Get a specific firewall zone by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            zoneId: { type: "string", description: "Firewall zone ID" },
          },
          required: ["siteId", "zoneId"],
        },
      },
      {
        name: "unifi_create_firewall_zone",
        description: "Create a new firewall zone",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "Zone name" },
            networkIds: {
              type: "array",
              items: { type: "string" },
              description: "Network IDs to include in this zone",
            },
          },
          required: ["siteId", "name"],
        },
      },
      {
        name: "unifi_update_firewall_zone",
        description: "Update a firewall zone",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            zoneId: { type: "string", description: "Firewall zone ID" },
            name: { type: "string", description: "Zone name" },
            networkIds: {
              type: "array",
              items: { type: "string" },
              description: "Network IDs to include in this zone",
            },
          },
          required: ["siteId", "zoneId"],
        },
      },
      {
        name: "unifi_delete_firewall_zone",
        description: "Delete a firewall zone",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            zoneId: { type: "string", description: "Firewall zone ID" },
          },
          required: ["siteId", "zoneId"],
        },
      },

      // ============================================
      // ACL RULES (Firewall Rules)
      // ============================================
      {
        name: "unifi_list_acl_rules",
        description: "List all ACL (firewall) rules at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_acl_rule",
        description: "Get a specific ACL rule by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            ruleId: { type: "string", description: "ACL rule ID" },
          },
          required: ["siteId", "ruleId"],
        },
      },
      {
        name: "unifi_create_acl_rule",
        description: "Create a new ACL (firewall) rule",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "Rule name" },
            enabled: { type: "boolean", description: "Enable the rule" },
            action: { type: "string", enum: ["ALLOW", "DENY", "REJECT"], description: "Rule action" },
            index: { type: "number", description: "Rule priority index (lower = higher priority)" },
            protocol: { type: "string", enum: ["all", "tcp", "udp", "tcp_udp", "icmp"], description: "Protocol" },
            sourceZoneId: { type: "string", description: "Source firewall zone ID" },
            destinationZoneId: { type: "string", description: "Destination firewall zone ID" },
            sourceAddress: { type: "string", description: "Source IP/CIDR" },
            destinationAddress: { type: "string", description: "Destination IP/CIDR" },
            sourcePort: { type: "string", description: "Source port or range (e.g., '80' or '80-443')" },
            destinationPort: { type: "string", description: "Destination port or range" },
            description: { type: "string", description: "Rule description" },
            schedule: {
              type: "object",
              description: "Time-based schedule",
              properties: {
                mode: { type: "string", enum: ["always", "custom"] },
                days: { type: "array", items: { type: "string" } },
                timeRanges: { type: "array", items: { type: "object" } },
              },
            },
          },
          required: ["siteId", "name", "action", "sourceZoneId", "destinationZoneId"],
        },
      },
      {
        name: "unifi_update_acl_rule",
        description: "Update an ACL rule",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            ruleId: { type: "string", description: "ACL rule ID" },
            name: { type: "string", description: "Rule name" },
            enabled: { type: "boolean", description: "Enable the rule" },
            action: { type: "string", enum: ["ALLOW", "DENY", "REJECT"], description: "Rule action" },
            index: { type: "number", description: "Rule priority index" },
            protocol: { type: "string", enum: ["all", "tcp", "udp", "tcp_udp", "icmp"], description: "Protocol" },
            sourceAddress: { type: "string", description: "Source IP/CIDR" },
            destinationAddress: { type: "string", description: "Destination IP/CIDR" },
            sourcePort: { type: "string", description: "Source port or range" },
            destinationPort: { type: "string", description: "Destination port or range" },
            description: { type: "string", description: "Rule description" },
          },
          required: ["siteId", "ruleId"],
        },
      },
      {
        name: "unifi_delete_acl_rule",
        description: "Delete an ACL rule",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            ruleId: { type: "string", description: "ACL rule ID" },
          },
          required: ["siteId", "ruleId"],
        },
      },
      {
        name: "unifi_batch_update_acl_rules",
        description: "Batch update ACL rules (reorder, enable/disable multiple rules)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            rules: {
              type: "array",
              description: "Array of rule updates",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Rule ID" },
                  index: { type: "number", description: "New index" },
                  enabled: { type: "boolean", description: "Enabled state" },
                },
              },
            },
          },
          required: ["siteId", "rules"],
        },
      },

      // ============================================
      // TRAFFIC MATCHING LISTS
      // ============================================
      {
        name: "unifi_list_traffic_matching_lists",
        description: "List all traffic matching lists at a site (IP groups, port groups, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_traffic_matching_list",
        description: "Get a specific traffic matching list by ID",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            listId: { type: "string", description: "Traffic matching list ID" },
          },
          required: ["siteId", "listId"],
        },
      },
      {
        name: "unifi_create_traffic_matching_list",
        description: "Create a new traffic matching list",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "List name" },
            type: { type: "string", enum: ["IP_ADDRESS", "PORT", "IP_PORT", "DOMAIN", "APP", "REGION"], description: "List type" },
            entries: {
              type: "array",
              description: "List entries",
              items: {
                type: "object",
                properties: {
                  address: { type: "string", description: "IP address or CIDR" },
                  port: { type: "string", description: "Port or port range" },
                  protocol: { type: "string", description: "Protocol (tcp, udp)" },
                  domain: { type: "string", description: "Domain name" },
                  appId: { type: "string", description: "DPI application ID" },
                  regionCode: { type: "string", description: "Country/region code" },
                },
              },
            },
          },
          required: ["siteId", "name", "type"],
        },
      },
      {
        name: "unifi_update_traffic_matching_list",
        description: "Update a traffic matching list",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            listId: { type: "string", description: "Traffic matching list ID" },
            name: { type: "string", description: "List name" },
            entries: {
              type: "array",
              description: "List entries",
              items: { type: "object" },
            },
          },
          required: ["siteId", "listId"],
        },
      },
      {
        name: "unifi_delete_traffic_matching_list",
        description: "Delete a traffic matching list",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            listId: { type: "string", description: "Traffic matching list ID" },
          },
          required: ["siteId", "listId"],
        },
      },

      // ============================================
      // SUPPORTING RESOURCES
      // ============================================
      {
        name: "unifi_list_wans",
        description: "List all WAN interfaces at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_vpns",
        description: "List all VPN configurations at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_radius_profiles",
        description: "List all RADIUS profiles at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_get_system_log",
        description: "Get system log entries for a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            limit: { type: "number", description: "Maximum number of entries to return" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_dpi_categories",
        description: "List all DPI (Deep Packet Inspection) categories",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "unifi_list_dpi_applications",
        description: "List all DPI applications for traffic identification",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "unifi_list_countries",
        description: "List all countries/regions for geo-based rules",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs || {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      // ============================================
      // APPLICATION INFO
      // ============================================
      case "unifi_get_info":
        result = await unifiRequest("/v1/info");
        break;

      // ============================================
      // SITES
      // ============================================
      case "unifi_list_sites":
        result = await unifiRequest("/v1/sites");
        break;

      // ============================================
      // DEVICES
      // ============================================
      case "unifi_list_devices":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices`);
        break;

      case "unifi_get_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}`);
        break;

      case "unifi_get_device_statistics":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/statistics/latest`);
        break;

      case "unifi_adopt_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/actions/adopt`, "POST");
        break;

      case "unifi_restart_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/actions/restart`, "POST");
        break;

      case "unifi_locate_device":
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/devices/${args.deviceId}/actions/locate`,
          "POST",
          { enabled: args.enabled }
        );
        break;

      case "unifi_list_pending_devices":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/pending`);
        break;

      // ============================================
      // CLIENTS
      // ============================================
      case "unifi_list_clients":
        result = await unifiRequest(`/v1/sites/${args.siteId}/clients`);
        break;

      case "unifi_get_client":
        result = await unifiRequest(`/v1/sites/${args.siteId}/clients/${args.clientId}`);
        break;

      case "unifi_authorize_guest": {
        const authBody: Record<string, unknown> = { expiresAt: args.expiresAt };
        if (args.usageQuota) authBody.usageQuota = args.usageQuota;
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/clients/${args.clientId}/actions/authorizeGuest`,
          "POST",
          authBody
        );
        break;
      }

      // ============================================
      // NETWORKS
      // ============================================
      case "unifi_list_networks":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks`);
        break;

      case "unifi_get_network":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`);
        break;

      case "unifi_create_network": {
        const networkBody: Record<string, unknown> = {
          name: args.name,
          purpose: args.purpose,
        };
        if (args.vlanId !== undefined) networkBody.vlanId = args.vlanId;
        if (args.dhcpEnabled !== undefined) networkBody.dhcpEnabled = args.dhcpEnabled;
        if (args.dhcpStart) networkBody.dhcpStart = args.dhcpStart;
        if (args.dhcpStop) networkBody.dhcpStop = args.dhcpStop;
        if (args.gateway) networkBody.gateway = args.gateway;
        if (args.subnet) networkBody.subnet = args.subnet;
        if (args.domainName) networkBody.domainName = args.domainName;
        if (args.internetAccessEnabled !== undefined) networkBody.internetAccessEnabled = args.internetAccessEnabled;
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks`, "POST", networkBody);
        break;
      }

      case "unifi_update_network": {
        const updateNetworkBody: Record<string, unknown> = {};
        if (args.name) updateNetworkBody.name = args.name;
        if (args.purpose) updateNetworkBody.purpose = args.purpose;
        if (args.vlanId !== undefined) updateNetworkBody.vlanId = args.vlanId;
        if (args.dhcpEnabled !== undefined) updateNetworkBody.dhcpEnabled = args.dhcpEnabled;
        if (args.dhcpStart) updateNetworkBody.dhcpStart = args.dhcpStart;
        if (args.dhcpStop) updateNetworkBody.dhcpStop = args.dhcpStop;
        if (args.gateway) updateNetworkBody.gateway = args.gateway;
        if (args.subnet) updateNetworkBody.subnet = args.subnet;
        if (args.domainName) updateNetworkBody.domainName = args.domainName;
        if (args.internetAccessEnabled !== undefined) updateNetworkBody.internetAccessEnabled = args.internetAccessEnabled;
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`, "PUT", updateNetworkBody);
        break;
      }

      case "unifi_delete_network":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`, "DELETE");
        break;

      // ============================================
      // WIFI
      // ============================================
      case "unifi_list_wifi":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi`);
        break;

      case "unifi_get_wifi":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/${args.wifiId}`);
        break;

      case "unifi_create_wifi": {
        const wifiBody: Record<string, unknown> = {
          name: args.name,
          security: args.security,
          networkId: args.networkId,
        };
        if (args.enabled !== undefined) wifiBody.enabled = args.enabled;
        if (args.password) wifiBody.password = args.password;
        if (args.hideSsid !== undefined) wifiBody.hideSsid = args.hideSsid;
        if (args.band) wifiBody.band = args.band;
        if (args.bandSteeringEnabled !== undefined) wifiBody.bandSteeringEnabled = args.bandSteeringEnabled;
        if (args.wpa3TransitionMode !== undefined) wifiBody.wpa3TransitionMode = args.wpa3TransitionMode;
        if (args.pmfMode) wifiBody.pmfMode = args.pmfMode;
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi`, "POST", wifiBody);
        break;
      }

      case "unifi_update_wifi": {
        const updateWifiBody: Record<string, unknown> = {};
        if (args.name) updateWifiBody.name = args.name;
        if (args.enabled !== undefined) updateWifiBody.enabled = args.enabled;
        if (args.security) updateWifiBody.security = args.security;
        if (args.password) updateWifiBody.password = args.password;
        if (args.networkId) updateWifiBody.networkId = args.networkId;
        if (args.hideSsid !== undefined) updateWifiBody.hideSsid = args.hideSsid;
        if (args.band) updateWifiBody.band = args.band;
        if (args.bandSteeringEnabled !== undefined) updateWifiBody.bandSteeringEnabled = args.bandSteeringEnabled;
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/${args.wifiId}`, "PUT", updateWifiBody);
        break;
      }

      case "unifi_delete_wifi":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/${args.wifiId}`, "DELETE");
        break;

      // ============================================
      // HOTSPOT VOUCHERS
      // ============================================
      case "unifi_list_vouchers":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers`);
        break;

      case "unifi_get_voucher":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers/${args.voucherId}`);
        break;

      case "unifi_create_voucher": {
        const voucherBody: Record<string, unknown> = {
          count: args.count,
          duration: args.duration,
        };
        if (args.usageQuota) voucherBody.usageQuota = args.usageQuota;
        if (args.multiUse !== undefined) voucherBody.multiUse = args.multiUse;
        if (args.maxUses !== undefined) voucherBody.maxUses = args.maxUses;
        if (args.note) voucherBody.note = args.note;
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers`, "POST", voucherBody);
        break;
      }

      case "unifi_update_voucher": {
        const updateVoucherBody: Record<string, unknown> = {};
        if (args.note) updateVoucherBody.note = args.note;
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers/${args.voucherId}`, "PUT", updateVoucherBody);
        break;
      }

      case "unifi_delete_voucher":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspotVouchers/${args.voucherId}`, "DELETE");
        break;

      // ============================================
      // FIREWALL ZONES
      // ============================================
      case "unifi_list_firewall_zones":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallZones`);
        break;

      case "unifi_get_firewall_zone":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallZones/${args.zoneId}`);
        break;

      case "unifi_create_firewall_zone": {
        const zoneBody: Record<string, unknown> = { name: args.name };
        if (args.networkIds) zoneBody.networkIds = args.networkIds;
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallZones`, "POST", zoneBody);
        break;
      }

      case "unifi_update_firewall_zone": {
        const updateZoneBody: Record<string, unknown> = {};
        if (args.name) updateZoneBody.name = args.name;
        if (args.networkIds) updateZoneBody.networkIds = args.networkIds;
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallZones/${args.zoneId}`, "PUT", updateZoneBody);
        break;
      }

      case "unifi_delete_firewall_zone":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallZones/${args.zoneId}`, "DELETE");
        break;

      // ============================================
      // ACL RULES
      // ============================================
      case "unifi_list_acl_rules":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallRulesAcl`);
        break;

      case "unifi_get_acl_rule":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallRulesAcl/${args.ruleId}`);
        break;

      case "unifi_create_acl_rule": {
        const ruleBody: Record<string, unknown> = {
          name: args.name,
          action: args.action,
          sourceZoneId: args.sourceZoneId,
          destinationZoneId: args.destinationZoneId,
        };
        if (args.enabled !== undefined) ruleBody.enabled = args.enabled;
        if (args.index !== undefined) ruleBody.index = args.index;
        if (args.protocol) ruleBody.protocol = args.protocol;
        if (args.sourceAddress) ruleBody.sourceAddress = args.sourceAddress;
        if (args.destinationAddress) ruleBody.destinationAddress = args.destinationAddress;
        if (args.sourcePort) ruleBody.sourcePort = args.sourcePort;
        if (args.destinationPort) ruleBody.destinationPort = args.destinationPort;
        if (args.description) ruleBody.description = args.description;
        if (args.schedule) ruleBody.schedule = args.schedule;
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallRulesAcl`, "POST", ruleBody);
        break;
      }

      case "unifi_update_acl_rule": {
        const updateRuleBody: Record<string, unknown> = {};
        if (args.name) updateRuleBody.name = args.name;
        if (args.enabled !== undefined) updateRuleBody.enabled = args.enabled;
        if (args.action) updateRuleBody.action = args.action;
        if (args.index !== undefined) updateRuleBody.index = args.index;
        if (args.protocol) updateRuleBody.protocol = args.protocol;
        if (args.sourceAddress) updateRuleBody.sourceAddress = args.sourceAddress;
        if (args.destinationAddress) updateRuleBody.destinationAddress = args.destinationAddress;
        if (args.sourcePort) updateRuleBody.sourcePort = args.sourcePort;
        if (args.destinationPort) updateRuleBody.destinationPort = args.destinationPort;
        if (args.description) updateRuleBody.description = args.description;
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallRulesAcl/${args.ruleId}`, "PUT", updateRuleBody);
        break;
      }

      case "unifi_delete_acl_rule":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallRulesAcl/${args.ruleId}`, "DELETE");
        break;

      case "unifi_batch_update_acl_rules":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewallRulesAcl/batchUpdate`, "POST", { rules: args.rules });
        break;

      // ============================================
      // TRAFFIC MATCHING LISTS
      // ============================================
      case "unifi_list_traffic_matching_lists":
        result = await unifiRequest(`/v1/sites/${args.siteId}/trafficMatchingLists`);
        break;

      case "unifi_get_traffic_matching_list":
        result = await unifiRequest(`/v1/sites/${args.siteId}/trafficMatchingLists/${args.listId}`);
        break;

      case "unifi_create_traffic_matching_list": {
        const listBody: Record<string, unknown> = {
          name: args.name,
          type: args.type,
        };
        if (args.entries) listBody.entries = args.entries;
        result = await unifiRequest(`/v1/sites/${args.siteId}/trafficMatchingLists`, "POST", listBody);
        break;
      }

      case "unifi_update_traffic_matching_list": {
        const updateListBody: Record<string, unknown> = {};
        if (args.name) updateListBody.name = args.name;
        if (args.entries) updateListBody.entries = args.entries;
        result = await unifiRequest(`/v1/sites/${args.siteId}/trafficMatchingLists/${args.listId}`, "PUT", updateListBody);
        break;
      }

      case "unifi_delete_traffic_matching_list":
        result = await unifiRequest(`/v1/sites/${args.siteId}/trafficMatchingLists/${args.listId}`, "DELETE");
        break;

      // ============================================
      // SUPPORTING RESOURCES
      // ============================================
      case "unifi_list_wans":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wans`);
        break;

      case "unifi_list_vpns":
        result = await unifiRequest(`/v1/sites/${args.siteId}/vpns`);
        break;

      case "unifi_list_radius_profiles":
        result = await unifiRequest(`/v1/sites/${args.siteId}/radiusProfiles`);
        break;

      case "unifi_get_system_log": {
        let endpoint = `/v1/sites/${args.siteId}/systemLog`;
        if (args.limit) endpoint += `?limit=${args.limit}`;
        result = await unifiRequest(endpoint);
        break;
      }

      case "unifi_list_dpi_categories":
        result = await unifiRequest("/v1/dpiCategories");
        break;

      case "unifi_list_dpi_applications":
        result = await unifiRequest("/v1/dpiApplications");
        break;

      case "unifi_list_countries":
        result = await unifiRequest("/v1/countries");
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UniFi Network MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
