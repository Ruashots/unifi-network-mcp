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

// Helper function to build query string for pagination and filtering
function buildQueryString(args: Record<string, unknown>): string {
  const params = new URLSearchParams();
  if (args.offset !== undefined) params.append("offset", String(args.offset));
  if (args.limit !== undefined) params.append("limit", String(args.limit));
  if (args.filter) params.append("filter", String(args.filter));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
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

  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Create the MCP server
const server = new Server(
  {
    name: "unifi-network-mcp",
    version: "1.3.0",
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
        inputSchema: {
          type: "object",
          properties: {
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression (e.g., 'name.like(office*)')" },
          },
          required: [],
        },
      },

      // ============================================
      // DEVICES
      // ============================================
      {
        name: "unifi_list_devices",
        description: "List all adopted devices at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
        description: "List devices pending adoption (global, not site-specific)",
        inputSchema: {
          type: "object",
          properties: {
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
          },
          required: [],
        },
      },
      {
        name: "unifi_power_cycle_port",
        description: "Power cycle a specific port on a device (PoE restart)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            deviceId: { type: "string", description: "Device ID" },
            portIdx: { type: "number", description: "Port index number" },
          },
          required: ["siteId", "deviceId", "portIdx"],
        },
      },

      // ============================================
      // CLIENTS
      // ============================================
      {
        name: "unifi_list_clients",
        description: "List all connected clients (wired, wireless, VPN) at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            timeLimitMinutes: { type: "number", description: "How long (in minutes) the guest will be authorized (1-1000000)" },
            dataUsageLimitMBytes: { type: "number", description: "Data usage limit in megabytes (1-1048576)" },
            rxRateLimitKbps: { type: "number", description: "Download rate limit in kilobits per second (2-100000)" },
            txRateLimitKbps: { type: "number", description: "Upload rate limit in kilobits per second (2-100000)" },
          },
          required: ["siteId", "clientId"],
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
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            management: { type: "string", enum: ["UNMANAGED", "GATEWAY"], description: "Network management type" },
            enabled: { type: "boolean", description: "Enable the network" },
            vlanId: { type: "number", description: "VLAN ID (2-4000)" },
          },
          required: ["siteId", "name", "management", "enabled", "vlanId"],
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
            management: { type: "string", enum: ["UNMANAGED", "GATEWAY"], description: "Network management type" },
            enabled: { type: "boolean", description: "Enable the network" },
            vlanId: { type: "number", description: "VLAN ID (2-4000)" },
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
            cascade: { type: "boolean", description: "Cascade delete (default: false)" },
            force: { type: "boolean", description: "Force delete (default: false)" },
          },
          required: ["siteId", "networkId"],
        },
      },
      {
        name: "unifi_get_network_references",
        description: "Get references to a network (what WiFi broadcasts, firewall zones, etc. use this network)",
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
      // WIFI BROADCASTS
      // ============================================
      {
        name: "unifi_list_wifi",
        description: "List all WiFi broadcasts (SSIDs) at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            wifiBroadcastId: { type: "string", description: "WiFi Broadcast ID" },
          },
          required: ["siteId", "wifiBroadcastId"],
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
            type: { type: "string", enum: ["STANDARD"], description: "WiFi type" },
            broadcastingFrequenciesGHz: { type: "array", items: { type: "string" }, description: "Frequencies: 2.4, 5, 6" },
          },
          required: ["siteId", "name", "enabled", "type", "broadcastingFrequenciesGHz"],
        },
      },
      {
        name: "unifi_update_wifi",
        description: "Update an existing WiFi network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            wifiBroadcastId: { type: "string", description: "WiFi Broadcast ID" },
            name: { type: "string", description: "SSID name" },
            enabled: { type: "boolean", description: "Enable the WiFi network" },
          },
          required: ["siteId", "wifiBroadcastId"],
        },
      },
      {
        name: "unifi_delete_wifi",
        description: "Delete a WiFi network",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            wifiBroadcastId: { type: "string", description: "WiFi Broadcast ID" },
            force: { type: "boolean", description: "Force delete (default: false)" },
          },
          required: ["siteId", "wifiBroadcastId"],
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
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 100, max: 1000)" },
            filter: { type: "string", description: "Filter expression (e.g., 'expired.eq(true)')" },
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
            name: { type: "string", description: "Voucher note/name (duplicated across all generated vouchers)" },
            timeLimitMinutes: { type: "number", description: "How long the voucher provides access (1-1000000 minutes)" },
            count: { type: "number", description: "Number of vouchers to create (1-1000, default: 1)" },
            authorizedGuestLimit: { type: "number", description: "How many guests can use this voucher" },
            dataUsageLimitMBytes: { type: "number", description: "Data usage limit in megabytes (1-1048576)" },
            rxRateLimitKbps: { type: "number", description: "Download rate limit in kbps (2-100000)" },
            txRateLimitKbps: { type: "number", description: "Upload rate limit in kbps (2-100000)" },
          },
          required: ["siteId", "name", "timeLimitMinutes"],
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
      {
        name: "unifi_bulk_delete_vouchers",
        description: "Bulk delete hotspot vouchers based on filter criteria (e.g., 'expired.eq(true)' to delete all expired vouchers)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            filter: { type: "string", description: "Required filter expression (e.g., 'expired.eq(true)', 'name.like(guest*)')" },
          },
          required: ["siteId", "filter"],
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
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            firewallZoneId: { type: "string", description: "Firewall zone ID" },
          },
          required: ["siteId", "firewallZoneId"],
        },
      },
      {
        name: "unifi_create_firewall_zone",
        description: "Create a new custom firewall zone",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            name: { type: "string", description: "Zone name" },
            networkIds: { type: "array", items: { type: "string" }, description: "Network IDs to include in this zone" },
          },
          required: ["siteId", "name", "networkIds"],
        },
      },
      {
        name: "unifi_update_firewall_zone",
        description: "Update a firewall zone",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            firewallZoneId: { type: "string", description: "Firewall zone ID" },
            name: { type: "string", description: "Zone name" },
            networkIds: { type: "array", items: { type: "string" }, description: "Network IDs to include in this zone" },
          },
          required: ["siteId", "firewallZoneId", "name", "networkIds"],
        },
      },
      {
        name: "unifi_delete_firewall_zone",
        description: "Delete a custom firewall zone",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            firewallZoneId: { type: "string", description: "Firewall zone ID" },
          },
          required: ["siteId", "firewallZoneId"],
        },
      },

      // ============================================
      // ACL RULES
      // ============================================
      {
        name: "unifi_list_acl_rules",
        description: "List all ACL (firewall) rules at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            aclRuleId: { type: "string", description: "ACL rule ID" },
          },
          required: ["siteId", "aclRuleId"],
        },
      },
      {
        name: "unifi_create_acl_rule",
        description: "Create a new ACL (firewall) rule",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            type: { type: "string", enum: ["IPV4"], description: "Rule type" },
            name: { type: "string", description: "Rule name" },
            enabled: { type: "boolean", description: "Enable the rule" },
            action: { type: "string", enum: ["ALLOW", "BLOCK"], description: "Rule action" },
            index: { type: "number", description: "Rule priority index (lower = higher priority)" },
            description: { type: "string", description: "Rule description" },
            protocolFilter: { type: "array", items: { type: "string" }, description: "Protocols: TCP, UDP" },
          },
          required: ["siteId", "type", "name", "enabled", "action", "index"],
        },
      },
      {
        name: "unifi_update_acl_rule",
        description: "Update an ACL rule",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            aclRuleId: { type: "string", description: "ACL rule ID" },
            type: { type: "string", enum: ["IPV4"], description: "Rule type" },
            name: { type: "string", description: "Rule name" },
            enabled: { type: "boolean", description: "Enable the rule" },
            action: { type: "string", enum: ["ALLOW", "BLOCK"], description: "Rule action" },
            index: { type: "number", description: "Rule priority index" },
            description: { type: "string", description: "Rule description" },
          },
          required: ["siteId", "aclRuleId"],
        },
      },
      {
        name: "unifi_delete_acl_rule",
        description: "Delete an ACL rule",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            aclRuleId: { type: "string", description: "ACL rule ID" },
          },
          required: ["siteId", "aclRuleId"],
        },
      },

      // ============================================
      // TRAFFIC MATCHING LISTS
      // ============================================
      {
        name: "unifi_list_traffic_matching_lists",
        description: "List all traffic matching lists at a site (port groups, IP groups)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            trafficMatchingListId: { type: "string", description: "Traffic matching list ID" },
          },
          required: ["siteId", "trafficMatchingListId"],
        },
      },
      {
        name: "unifi_create_traffic_matching_list",
        description: "Create a new traffic matching list",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            type: { type: "string", enum: ["PORTS", "IP_ADDRESSES"], description: "List type" },
            name: { type: "string", description: "List name" },
            items: { type: "array", description: "List items (ports or IP addresses)" },
          },
          required: ["siteId", "type", "name", "items"],
        },
      },
      {
        name: "unifi_update_traffic_matching_list",
        description: "Update a traffic matching list",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            trafficMatchingListId: { type: "string", description: "Traffic matching list ID" },
            type: { type: "string", enum: ["PORTS", "IP_ADDRESSES"], description: "List type" },
            name: { type: "string", description: "List name" },
            items: { type: "array", description: "List items" },
          },
          required: ["siteId", "trafficMatchingListId"],
        },
      },
      {
        name: "unifi_delete_traffic_matching_list",
        description: "Delete a traffic matching list",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            trafficMatchingListId: { type: "string", description: "Traffic matching list ID" },
          },
          required: ["siteId", "trafficMatchingListId"],
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
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_vpn_tunnels",
        description: "List all site-to-site VPN tunnels at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_vpn_servers",
        description: "List all VPN servers at a site",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
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
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_device_tags",
        description: "List all device tags at a site (used for WiFi broadcast assignments)",
        inputSchema: {
          type: "object",
          properties: {
            siteId: { type: "string", description: "Site ID" },
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
          },
          required: ["siteId"],
        },
      },
      {
        name: "unifi_list_dpi_categories",
        description: "List all DPI (Deep Packet Inspection) categories for traffic identification",
        inputSchema: {
          type: "object",
          properties: {
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
          },
          required: [],
        },
      },
      {
        name: "unifi_list_dpi_applications",
        description: "List all DPI applications for traffic identification and filtering",
        inputSchema: {
          type: "object",
          properties: {
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression" },
          },
          required: [],
        },
      },
      {
        name: "unifi_list_countries",
        description: "List all countries/regions for geo-based rules (ISO codes and names)",
        inputSchema: {
          type: "object",
          properties: {
            offset: { type: "number", description: "Number of records to skip (default: 0)" },
            limit: { type: "number", description: "Number of records to return (default: 25, max: 200)" },
            filter: { type: "string", description: "Filter expression (e.g., 'name.like(United*)')" },
          },
          required: [],
        },
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
        result = await unifiRequest(`/v1/sites${buildQueryString(args)}`);
        break;

      // ============================================
      // DEVICES
      // ============================================
      case "unifi_list_devices":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices${buildQueryString(args)}`);
        break;

      case "unifi_get_device":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}`);
        break;

      case "unifi_get_device_statistics":
        result = await unifiRequest(`/v1/sites/${args.siteId}/devices/${args.deviceId}/statistics/latest`);
        break;

      case "unifi_adopt_device":
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/devices/${args.deviceId}/actions`,
          "POST",
          { action: "ADOPT" }
        );
        break;

      case "unifi_restart_device":
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/devices/${args.deviceId}/actions`,
          "POST",
          { action: "RESTART" }
        );
        break;

      case "unifi_locate_device":
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/devices/${args.deviceId}/actions`,
          "POST",
          { action: args.enabled ? "LOCATE_ON" : "LOCATE_OFF" }
        );
        break;

      case "unifi_list_pending_devices":
        result = await unifiRequest(`/v1/pending-devices${buildQueryString(args)}`);
        break;

      case "unifi_power_cycle_port":
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/devices/${args.deviceId}/interfaces/ports/${args.portIdx}/actions`,
          "POST",
          { action: "POWER_CYCLE" }
        );
        break;

      // ============================================
      // CLIENTS
      // ============================================
      case "unifi_list_clients":
        result = await unifiRequest(`/v1/sites/${args.siteId}/clients${buildQueryString(args)}`);
        break;

      case "unifi_get_client":
        result = await unifiRequest(`/v1/sites/${args.siteId}/clients/${args.clientId}`);
        break;

      case "unifi_authorize_guest": {
        const authBody: Record<string, unknown> = { action: "AUTHORIZE_GUEST_ACCESS" };
        if (args.timeLimitMinutes) authBody.timeLimitMinutes = args.timeLimitMinutes;
        if (args.dataUsageLimitMBytes) authBody.dataUsageLimitMBytes = args.dataUsageLimitMBytes;
        if (args.rxRateLimitKbps) authBody.rxRateLimitKbps = args.rxRateLimitKbps;
        if (args.txRateLimitKbps) authBody.txRateLimitKbps = args.txRateLimitKbps;
        result = await unifiRequest(
          `/v1/sites/${args.siteId}/clients/${args.clientId}/actions`,
          "POST",
          authBody
        );
        break;
      }

      // ============================================
      // NETWORKS
      // ============================================
      case "unifi_list_networks":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks${buildQueryString(args)}`);
        break;

      case "unifi_get_network":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`);
        break;

      case "unifi_create_network": {
        const networkBody: Record<string, unknown> = {
          management: args.management,
          name: args.name,
          enabled: args.enabled,
          vlanId: args.vlanId,
        };
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks`, "POST", networkBody);
        break;
      }

      case "unifi_update_network": {
        const updateNetworkBody: Record<string, unknown> = {};
        if (args.management) updateNetworkBody.management = args.management;
        if (args.name) updateNetworkBody.name = args.name;
        if (args.enabled !== undefined) updateNetworkBody.enabled = args.enabled;
        if (args.vlanId !== undefined) updateNetworkBody.vlanId = args.vlanId;
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}`, "PUT", updateNetworkBody);
        break;
      }

      case "unifi_delete_network": {
        let endpoint = `/v1/sites/${args.siteId}/networks/${args.networkId}`;
        const params = new URLSearchParams();
        if (args.cascade) params.append("cascade", "true");
        if (args.force) params.append("force", "true");
        if (params.toString()) endpoint += `?${params.toString()}`;
        result = await unifiRequest(endpoint, "DELETE");
        break;
      }

      case "unifi_get_network_references":
        result = await unifiRequest(`/v1/sites/${args.siteId}/networks/${args.networkId}/references`);
        break;

      // ============================================
      // WIFI BROADCASTS
      // ============================================
      case "unifi_list_wifi":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/broadcasts${buildQueryString(args)}`);
        break;

      case "unifi_get_wifi":
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/broadcasts/${args.wifiBroadcastId}`);
        break;

      case "unifi_create_wifi": {
        const wifiBody: Record<string, unknown> = {
          type: args.type || "STANDARD",
          name: args.name,
          enabled: args.enabled,
          broadcastingFrequenciesGHz: args.broadcastingFrequenciesGHz,
        };
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/broadcasts`, "POST", wifiBody);
        break;
      }

      case "unifi_update_wifi": {
        const updateWifiBody: Record<string, unknown> = {};
        if (args.name) updateWifiBody.name = args.name;
        if (args.enabled !== undefined) updateWifiBody.enabled = args.enabled;
        result = await unifiRequest(`/v1/sites/${args.siteId}/wifi/broadcasts/${args.wifiBroadcastId}`, "PUT", updateWifiBody);
        break;
      }

      case "unifi_delete_wifi": {
        let endpoint = `/v1/sites/${args.siteId}/wifi/broadcasts/${args.wifiBroadcastId}`;
        if (args.force) endpoint += "?force=true";
        result = await unifiRequest(endpoint, "DELETE");
        break;
      }

      // ============================================
      // HOTSPOT VOUCHERS
      // ============================================
      case "unifi_list_vouchers":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspot/vouchers${buildQueryString(args)}`);
        break;

      case "unifi_get_voucher":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspot/vouchers/${args.voucherId}`);
        break;

      case "unifi_create_voucher": {
        const voucherBody: Record<string, unknown> = {
          name: args.name,
          timeLimitMinutes: args.timeLimitMinutes,
        };
        if (args.count) voucherBody.count = args.count;
        if (args.authorizedGuestLimit) voucherBody.authorizedGuestLimit = args.authorizedGuestLimit;
        if (args.dataUsageLimitMBytes) voucherBody.dataUsageLimitMBytes = args.dataUsageLimitMBytes;
        if (args.rxRateLimitKbps) voucherBody.rxRateLimitKbps = args.rxRateLimitKbps;
        if (args.txRateLimitKbps) voucherBody.txRateLimitKbps = args.txRateLimitKbps;
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspot/vouchers`, "POST", voucherBody);
        break;
      }

      case "unifi_delete_voucher":
        result = await unifiRequest(`/v1/sites/${args.siteId}/hotspot/vouchers/${args.voucherId}`, "DELETE");
        break;

      case "unifi_bulk_delete_vouchers": {
        const endpoint = `/v1/sites/${args.siteId}/hotspot/vouchers?filter=${encodeURIComponent(args.filter as string)}`;
        result = await unifiRequest(endpoint, "DELETE");
        break;
      }

      // ============================================
      // FIREWALL ZONES
      // ============================================
      case "unifi_list_firewall_zones":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewall/zones${buildQueryString(args)}`);
        break;

      case "unifi_get_firewall_zone":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewall/zones/${args.firewallZoneId}`);
        break;

      case "unifi_create_firewall_zone": {
        const zoneBody: Record<string, unknown> = {
          name: args.name,
          networkIds: args.networkIds || [],
        };
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewall/zones`, "POST", zoneBody);
        break;
      }

      case "unifi_update_firewall_zone": {
        const updateZoneBody: Record<string, unknown> = {
          name: args.name,
          networkIds: args.networkIds,
        };
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewall/zones/${args.firewallZoneId}`, "PUT", updateZoneBody);
        break;
      }

      case "unifi_delete_firewall_zone":
        result = await unifiRequest(`/v1/sites/${args.siteId}/firewall/zones/${args.firewallZoneId}`, "DELETE");
        break;

      // ============================================
      // ACL RULES
      // ============================================
      case "unifi_list_acl_rules":
        result = await unifiRequest(`/v1/sites/${args.siteId}/acl-rules${buildQueryString(args)}`);
        break;

      case "unifi_get_acl_rule":
        result = await unifiRequest(`/v1/sites/${args.siteId}/acl-rules/${args.aclRuleId}`);
        break;

      case "unifi_create_acl_rule": {
        const ruleBody: Record<string, unknown> = {
          type: args.type || "IPV4",
          name: args.name,
          enabled: args.enabled,
          action: args.action,
          index: args.index,
        };
        if (args.description) ruleBody.description = args.description;
        if (args.protocolFilter) ruleBody.protocolFilter = args.protocolFilter;
        result = await unifiRequest(`/v1/sites/${args.siteId}/acl-rules`, "POST", ruleBody);
        break;
      }

      case "unifi_update_acl_rule": {
        const updateRuleBody: Record<string, unknown> = {};
        if (args.type) updateRuleBody.type = args.type;
        if (args.name) updateRuleBody.name = args.name;
        if (args.enabled !== undefined) updateRuleBody.enabled = args.enabled;
        if (args.action) updateRuleBody.action = args.action;
        if (args.index !== undefined) updateRuleBody.index = args.index;
        if (args.description) updateRuleBody.description = args.description;
        result = await unifiRequest(`/v1/sites/${args.siteId}/acl-rules/${args.aclRuleId}`, "PUT", updateRuleBody);
        break;
      }

      case "unifi_delete_acl_rule":
        result = await unifiRequest(`/v1/sites/${args.siteId}/acl-rules/${args.aclRuleId}`, "DELETE");
        break;

      // ============================================
      // TRAFFIC MATCHING LISTS
      // ============================================
      case "unifi_list_traffic_matching_lists":
        result = await unifiRequest(`/v1/sites/${args.siteId}/traffic-matching-lists${buildQueryString(args)}`);
        break;

      case "unifi_get_traffic_matching_list":
        result = await unifiRequest(`/v1/sites/${args.siteId}/traffic-matching-lists/${args.trafficMatchingListId}`);
        break;

      case "unifi_create_traffic_matching_list": {
        const listBody: Record<string, unknown> = {
          type: args.type,
          name: args.name,
          items: args.items,
        };
        result = await unifiRequest(`/v1/sites/${args.siteId}/traffic-matching-lists`, "POST", listBody);
        break;
      }

      case "unifi_update_traffic_matching_list": {
        const updateListBody: Record<string, unknown> = {};
        if (args.type) updateListBody.type = args.type;
        if (args.name) updateListBody.name = args.name;
        if (args.items) updateListBody.items = args.items;
        result = await unifiRequest(`/v1/sites/${args.siteId}/traffic-matching-lists/${args.trafficMatchingListId}`, "PUT", updateListBody);
        break;
      }

      case "unifi_delete_traffic_matching_list":
        result = await unifiRequest(`/v1/sites/${args.siteId}/traffic-matching-lists/${args.trafficMatchingListId}`, "DELETE");
        break;

      // ============================================
      // SUPPORTING RESOURCES
      // ============================================
      case "unifi_list_wans": {
        const wanParams = new URLSearchParams();
        if (args.offset !== undefined) wanParams.append("offset", String(args.offset));
        if (args.limit !== undefined) wanParams.append("limit", String(args.limit));
        const wanQuery = wanParams.toString() ? `?${wanParams.toString()}` : "";
        result = await unifiRequest(`/v1/sites/${args.siteId}/wans${wanQuery}`);
        break;
      }

      case "unifi_list_vpn_tunnels":
        result = await unifiRequest(`/v1/sites/${args.siteId}/vpn/site-to-site-tunnels${buildQueryString(args)}`);
        break;

      case "unifi_list_vpn_servers":
        result = await unifiRequest(`/v1/sites/${args.siteId}/vpn/servers${buildQueryString(args)}`);
        break;

      case "unifi_list_radius_profiles":
        result = await unifiRequest(`/v1/sites/${args.siteId}/radius/profiles${buildQueryString(args)}`);
        break;

      case "unifi_list_device_tags":
        result = await unifiRequest(`/v1/sites/${args.siteId}/device-tags${buildQueryString(args)}`);
        break;

      case "unifi_list_dpi_categories":
        result = await unifiRequest(`/v1/dpi/categories${buildQueryString(args)}`);
        break;

      case "unifi_list_dpi_applications":
        result = await unifiRequest(`/v1/dpi/applications${buildQueryString(args)}`);
        break;

      case "unifi_list_countries":
        result = await unifiRequest(`/v1/countries${buildQueryString(args)}`);
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
