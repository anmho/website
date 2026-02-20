# OSI Model for Pragmatic Engineers

Most engineers do not debug by reciting all seven layers.  
They debug by narrowing failure scope quickly.

The OSI model is useful when treated as a checklist, not trivia.

## The 7 Layers (Short Version)

1. **L7 Application**: HTTP, gRPC, DNS semantics.
2. **L6 Presentation**: encoding, serialization, encryption format details.
3. **L5 Session**: connection/session behavior, retries, keep-alives.
4. **L4 Transport**: TCP/UDP, ports, retransmits, congestion control.
5. **L3 Network**: IP routing, subnets, NAT, TTL.
6. **L2 Data Link**: Ethernet, MAC, VLAN, ARP.
7. **L1 Physical**: wire, optics, radio, signal integrity.

## Practical Mapping (What You Actually Check)

### If it times out
1. L7: request path correct? auth blocking?
2. L4: connection established? SYN/SYN-ACK seen?
3. L3: route/NAT/ACL/security group blocking path?

### If it connects but data is weird
1. L7/L6: wrong content-type, schema mismatch, compression mismatch.
2. L4: partial reads, backpressure, closed sockets mid-stream.

### If only one subnet or AZ fails
1. L3/L2 first: route tables, NACLs, peering, ARP/VLAN issues.
2. Then L4/L7 behavior.

## TCP/IP vs OSI

Real stacks are usually discussed as:
1. Application
2. Transport
3. Internet
4. Link

OSI is still useful because it forces disciplined isolation of fault domains.

## Fast Debug Playbook

When "service is down":
1. **L7**: health endpoint and logs.
2. **L4**: `nc`/`telnet`/SYN checks to port.
3. **L3**: traceroute, route table, SG/NACL/firewall.
4. **L2/L1**: only if blast radius suggests infra segment issue.

This top-down path catches most incidents quickly.

## Where Latency Hides by Layer

1. L7: queueing, handler stalls, retries.
2. L4: handshake RTT, retransmits, head-of-line effects.
3. L3: path stretch, poor peering, detours.
4. L2/L1: packet loss from bad links/hardware.

If you only look at app traces, you miss transport and routing tax.

## What to Memorize

1. Ports and protocols are L4/L7 boundary concerns.
2. "Can ping" does not mean "can connect to app port."
3. "Connected" does not mean request semantics are valid.
4. A clean layer-by-layer narrowing beats random guess debugging every time.
