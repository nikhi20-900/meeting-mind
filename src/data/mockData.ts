import {
  DashboardStats,
  Decision,
  MeetingSummary,
  TaskItem,
  TeamMemberWeeklyDigest,
} from "@/types";

export const sampleDashboardStats: DashboardStats = {
  meetingsProcessed: 28,
  meetingsThisWeekDelta: "+4 this week",
  pendingTasks: 9,
  pendingTasksConfirmationCount: 3,
  upcomingDeadlines: 6,
  deadlinesWithin48Hours: 2,
  unresolvedConflicts: 2,
  conflictsAttentionNeeded: "Requires human review",
};

export const sampleMeetings: MeetingSummary[] = [
  {
    id: "mtg-101",
    title: "Q4 API Gateway Migration & Rate Limiting Sync",
    date: "2026-10-30",
    duration: "42 min",
    participants: ["Sarah Chen", "Marcus Vance", "Elena Rostova", "Liam Patel"],
    status: "Processed",
    decisionsCount: 3,
    tasksCount: 4,
    conflictsDetected: 1,
    snippet:
      "Agreed to adopt Envoy v1.32 for tier-1 traffic; flagged potential rate-limit clash with Enterprise SLA commitments made in Sep 2026.",
  },
  {
    id: "mtg-102",
    title: "Client Enterprise SLA & Support Tier Overhaul",
    date: "2026-10-28",
    duration: "35 min",
    participants: ["Marcus Vance", "Claire Dupont", "Jessica Miller"],
    status: "Processed",
    decisionsCount: 2,
    tasksCount: 3,
    conflictsDetected: 1,
    snippet:
      "Guaranteed 99.95% uptime for tier-1 endpoints with 5-minute failover guarantee, pending architecture team confirmation.",
  },
  {
    id: "mtg-103",
    title: "Design System 2.0 Dark Mode & Accessibility Audit",
    date: "2026-10-25",
    duration: "50 min",
    participants: ["Elena Rostova", "David Kim", "Liam Patel"],
    status: "Processed",
    decisionsCount: 2,
    tasksCount: 2,
    conflictsDetected: 0,
    snippet:
      "Finalized WCAG AAA contrast standard for all core dashboard text and established warm neutral base token set.",
  },
  {
    id: "mtg-104",
    title: "Data Retention & Cold Storage Compliance Review",
    date: "2026-10-22",
    duration: "28 min",
    participants: ["Sarah Chen", "Thomas Wright", "Legal Counsel"],
    status: "Processed",
    decisionsCount: 1,
    tasksCount: 2,
    conflictsDetected: 0,
    snippet:
      "Standardized customer telemetry archive cycle to 90 days hot, 365 days Glacier cold storage.",
  },
];

export const sampleTasks: TaskItem[] = [
  {
    id: "tsk-01",
    title: "Benchmark Envoy gateway latency under simulated 15k req/sec peak load",
    owner: {
      name: "Marcus Vance",
      avatar: "MV",
      role: "Infrastructure Lead",
      email: "marcus.vance@meetingmind.internal",
    },
    dueDate: "2026-11-03",
    priority: "High",
    status: "Awaiting Approval",
    associatedMeeting: "Q4 API Gateway Migration & Rate Limiting Sync",
    associatedDecisionId: "dec-01",
    associatedDecisionText: "Cap standard API clients at 1,200 requests/minute to protect core database connection pools.",
    requiresUserConfirmation: true,
  },
  {
    id: "tsk-02",
    title: "Draft reconciled Enterprise SLA addendum reflecting 5-min failover limits",
    owner: {
      name: "Claire Dupont",
      avatar: "CD",
      role: "Client Success VP",
      email: "claire.dupont@meetingmind.internal",
    },
    dueDate: "2026-11-04",
    priority: "High",
    status: "Awaiting Approval",
    associatedMeeting: "Client Enterprise SLA & Support Tier Overhaul",
    associatedDecisionId: "dec-02",
    associatedDecisionText: "Guarantee 99.95% availability with dedicated burst headroom for Enterprise contract renewals.",
    requiresUserConfirmation: true,
  },
  {
    id: "tsk-03",
    title: "Audit Redis cluster eviction policies before migration cutoff",
    owner: {
      name: "Liam Patel",
      avatar: "LP",
      role: "SRE Lead",
      email: "liam.patel@meetingmind.internal",
    },
    dueDate: "2026-11-05",
    priority: "High",
    status: "Awaiting Approval",
    associatedMeeting: "Q4 API Gateway Migration & Rate Limiting Sync",
    associatedDecisionId: "dec-01",
    associatedDecisionText: "Protect database connection pools from retry storms during failover windows.",
    requiresUserConfirmation: true,
  },
  {
    id: "tsk-04",
    title: "Update Tailwind CSS design system tokens for high-contrast accessibility",
    owner: {
      name: "Elena Rostova",
      avatar: "ER",
      role: "Design Systems Lead",
      email: "elena.rostova@meetingmind.internal",
    },
    dueDate: "2026-11-06",
    priority: "Medium",
    status: "In Progress",
    associatedMeeting: "Design System 2.0 Dark Mode & Accessibility Audit",
    associatedDecisionId: "dec-03",
    associatedDecisionText: "Enforce WCAG AAA 7:1 contrast ratios across all primary data tables and user notification banners.",
    requiresUserConfirmation: false,
  },
  {
    id: "tsk-05",
    title: "Configure AWS S3 Glacier lifecycle transitions for raw telemetry buckets",
    owner: {
      name: "Sarah Chen",
      avatar: "SC",
      role: "DevOps Engineer",
      email: "sarah.chen@meetingmind.internal",
    },
    dueDate: "2026-11-09",
    priority: "Medium",
    status: "Confirmed",
    associatedMeeting: "Data Retention & Cold Storage Compliance Review",
    associatedDecisionId: "dec-04",
    associatedDecisionText: "Automatically transition telemetry logs to Glacier vault storage after 90 days.",
    requiresUserConfirmation: false,
  },
  {
    id: "tsk-06",
    title: "Verify automated failover circuit breaker telemetry in staging sandbox",
    owner: {
      name: "Liam Patel",
      avatar: "LP",
      role: "SRE Lead",
      email: "liam.patel@meetingmind.internal",
    },
    dueDate: "2026-11-12",
    priority: "Low",
    status: "Confirmed",
    associatedMeeting: "Q4 API Gateway Migration & Rate Limiting Sync",
    associatedDecisionId: "dec-01",
    associatedDecisionText: "Cap standard API clients at 1,200 req/min during failovers.",
    requiresUserConfirmation: false,
  },
  {
    id: "tsk-07",
    title: "Revoke legacy SSH keys and distribute WebAuthn YubiKeys to staging team",
    owner: {
      name: "Sarah Chen",
      avatar: "SC",
      role: "DevOps Engineer",
      email: "sarah.chen@meetingmind.internal",
    },
    dueDate: "2026-10-29",
    priority: "High",
    status: "Completed",
    associatedMeeting: "Security & Authentication Steering Committee",
    associatedDecisionId: "dec-06",
    associatedDecisionText: "Require hardware FIDO2 / WebAuthn keys for all production database access; deprecate SMS 2FA.",
    requiresUserConfirmation: false,
  },
  {
    id: "tsk-08",
    title: "Sunset NGINX proxy sidecar deployment manifests across staging clusters",
    owner: {
      name: "Marcus Vance",
      avatar: "MV",
      role: "Infrastructure Lead",
      email: "marcus.vance@meetingmind.internal",
    },
    dueDate: "2026-10-27",
    priority: "Medium",
    status: "Completed",
    associatedMeeting: "Sprint 42 Retrospective & Architecture Review",
    associatedDecisionId: "dec-05",
    associatedDecisionText: "Superseded: Replaced NGINX sidecars with Envoy v1.32 ingress proxy.",
    requiresUserConfirmation: false,
  },
  {
    id: "tsk-09",
    title: "Deploy experimental Redis Lua rate-limit scripts to production canary",
    owner: {
      name: "Marcus Vance",
      avatar: "MV",
      role: "Infrastructure Lead",
      email: "marcus.vance@meetingmind.internal",
    },
    dueDate: "2026-10-24",
    priority: "High",
    status: "Rejected",
    associatedMeeting: "Q4 API Gateway Migration & Rate Limiting Sync",
    associatedDecisionId: "dec-01",
    associatedDecisionText: "Rejected by human operator: Script clashed with multi-region replication safety limits.",
    requiresUserConfirmation: false,
  },
];

export const sampleDecisions: Decision[] = [
  {
    id: "dec-01",
    date: "Oct 30, 2026",
    meetingReference: "Q4 API Gateway Migration & Rate Limiting Sync",
    meetingId: "mtg-101",
    category: "Architecture",
    status: "Conflict Flagged",
    decisionText:
      "Cap standard API clients at 1,200 requests/minute to protect core database connection pools during failovers.",
    rationale:
      "Analysis of September outage showed unbounded retry storms overwhelmed PostgreSQL write replicas.",
    hasConflictWarning: true,
    conflictNotes:
      "Potential Conflict with Decision DEC-02 (Oct 28): Enterprise tier contracts promised burst capacity up to 3,000 req/min without throttling.",
  },
  {
    id: "dec-02",
    date: "Oct 28, 2026",
    meetingReference: "Client Enterprise SLA & Support Tier Overhaul",
    meetingId: "mtg-102",
    category: "Client SLA",
    status: "Under Review",
    decisionText:
      "Guarantee 99.95% availability with dedicated burst headroom for Enterprise contract renewals in Q4.",
    rationale:
      "Sales commitment required to secure the Horizon Capital and FinTech Global multi-year renewals.",
    hasConflictWarning: true,
    conflictNotes:
      "Cross-meeting conflict: API team decided a 1,200 req/min hard ceiling on Oct 30.",
  },
  {
    id: "dec-03",
    date: "Oct 25, 2026",
    meetingReference: "Design System 2.0 Dark Mode & Accessibility Audit",
    meetingId: "mtg-103",
    category: "Product",
    status: "Active",
    decisionText:
      "Enforce WCAG AAA 7:1 contrast ratios across all primary data tables and user notification banners.",
    rationale:
      "Ensures compliance ahead of upcoming European Accessibility Act (EAA) audit.",
  },
  {
    id: "dec-04",
    date: "Oct 22, 2026",
    meetingReference: "Data Retention & Cold Storage Compliance Review",
    meetingId: "mtg-104",
    category: "Governance",
    status: "Active",
    decisionText:
      "Automatically transition telemetry logs to Glacier vault storage after 90 days; purge non-anonymized user logs after 365 days.",
    rationale:
      "Reduces cloud infrastructure spend by 34% while satisfying ISO-27001 audit criteria.",
  },
  {
    id: "dec-05",
    date: "Oct 14, 2026",
    meetingReference: "Sprint 42 Retrospective & Architecture Review",
    meetingId: "mtg-098",
    category: "Architecture",
    status: "Superseded",
    decisionText:
      "Utilize NGINX open-source sidecars for microservice ingress routing.",
    rationale:
      "Replaced by Decision DEC-01 adopting Envoy v1.32 for native gRPC and circuit breaking support.",
  },
  {
    id: "dec-06",
    date: "Oct 08, 2026",
    meetingReference: "Security & Authentication Steering Committee",
    meetingId: "mtg-092",
    category: "Governance",
    status: "Active",
    decisionText:
      "Require hardware FIDO2 / WebAuthn keys for all production database access; deprecate SMS 2FA.",
    rationale:
      "Defends against phishing-resistant session hijacking vectors identified in recent red-team exercise.",
  },
];

export const sampleTeamDigests: Record<string, TeamMemberWeeklyDigest> = {
  all: {
    id: "all",
    name: "Entire Workspace Team",
    role: "Cross-functional Engineering & Operations",
    avatar: "MM",
    weeklySummary:
      "Across 4 synced meetings this week, the team reached consensus on 8 binding decisions and initialized 9 tasks. The biggest cross-functional focus is the Q4 API Gateway overhaul, which requires reconciling a newly discovered rate-limiting clash with existing Enterprise SLA terms before the Nov 10 freeze.",
    decisionsMade: [
      {
        id: "dec-01",
        text: "Cap standard API clients at 1,200 req/min for connection pool protection.",
        meeting: "Q4 API Gateway Migration & Rate Limiting Sync",
        date: "Oct 30, 2026",
      },
      {
        id: "dec-02",
        text: "Offer 99.95% uptime guarantees for Enterprise Q4 contracts.",
        meeting: "Client Enterprise SLA & Support Tier Overhaul",
        date: "Oct 28, 2026",
      },
      {
        id: "dec-03",
        text: "Adopt WCAG AAA 7:1 contrast standard for dashboard base tokens.",
        meeting: "Design System 2.0 Accessibility Audit",
        date: "Oct 25, 2026",
      },
    ],
    assignedTasks: [
      {
        id: "tsk-01",
        title: "Benchmark Envoy gateway latency under 15k req/sec peak load",
        priority: "High",
        dueDate: "Nov 03, 2026",
        status: "Awaiting Approval",
      },
      {
        id: "tsk-02",
        title: "Draft reconciled Enterprise SLA addendum reflecting 5-min failover",
        priority: "High",
        dueDate: "Nov 04, 2026",
        status: "Awaiting Approval",
      },
      {
        id: "tsk-04",
        title: "Update Tailwind CSS design system tokens for high-contrast accessibility",
        priority: "Medium",
        dueDate: "Nov 06, 2026",
        status: "In Progress",
      },
    ],
    completedWork: [
      {
        id: "comp-01",
        title: "Revoked legacy SSH access across staging servers and verified WebAuthn keys",
        completedDate: "Oct 29, 2026",
        impact: "Eliminated phishing attack vectors across 14 staging node clusters.",
      },
      {
        id: "comp-02",
        title: "Decommissioned deprecated NGINX proxy sidecar deployment charts",
        completedDate: "Oct 27, 2026",
        impact: "Reduced Kubernetes manifest drift and eliminated dual proxy overhead.",
      },
    ],
    upcomingDeadlines: [
      {
        id: "dl-01",
        title: "Envoy gateway 15k req/sec benchmark report (Marcus Vance)",
        deadline: "Nov 03, 2026",
        daysLeft: 3,
        urgency: "Immediate",
      },
      {
        id: "dl-02",
        title: "Enterprise SLA addendum reconciliation draft (Claire Dupont)",
        deadline: "Nov 04, 2026",
        daysLeft: 4,
        urgency: "Immediate",
      },
      {
        id: "dl-03",
        title: "Redis cluster eviction audit completion (Liam Patel)",
        deadline: "Nov 05, 2026",
        daysLeft: 5,
        urgency: "Approaching",
      },
      {
        id: "dl-04",
        title: "Design system token release v2.0 (Elena Rostova)",
        deadline: "Nov 06, 2026",
        daysLeft: 6,
        urgency: "Approaching",
      },
    ],
  },
  "marcus-vance": {
    id: "marcus-vance",
    name: "Marcus Vance",
    role: "Infrastructure Lead",
    avatar: "MV",
    weeklySummary:
      "Marcus led the technical investigation on Postgres write replica saturation. He proposed transitioning from NGINX to Envoy v1.32 and establishing a 1,200 req/min baseline limit. Currently awaiting operator approval on the 15k req/sec benchmark task to validate cluster resilience.",
    decisionsMade: [
      {
        id: "dec-01",
        text: "Cap standard API clients at 1,200 req/min to protect PostgreSQL write pools.",
        meeting: "Q4 API Gateway Migration & Rate Limiting Sync",
        date: "Oct 30, 2026",
      },
      {
        id: "dec-05",
        text: "Formally supersede NGINX reverse proxies in favor of Envoy sidecars.",
        meeting: "Sprint 42 Retrospective",
        date: "Oct 14, 2026",
      },
    ],
    assignedTasks: [
      {
        id: "tsk-01",
        title: "Benchmark Envoy gateway latency under simulated 15k req/sec peak load",
        priority: "High",
        dueDate: "Nov 03, 2026",
        status: "Awaiting Approval",
      },
    ],
    completedWork: [
      {
        id: "comp-02",
        title: "Sunset NGINX proxy sidecar deployment manifests across staging clusters",
        completedDate: "Oct 27, 2026",
        impact: "Cleaned up obsolete manifests and reduced deploy pipeline time by 18%.",
      },
    ],
    upcomingDeadlines: [
      {
        id: "dl-01",
        title: "Envoy gateway 15k req/sec benchmark signoff",
        deadline: "Nov 03, 2026",
        daysLeft: 3,
        urgency: "Immediate",
      },
    ],
  },
  "sarah-chen": {
    id: "sarah-chen",
    name: "Sarah Chen",
    role: "DevOps Engineer",
    avatar: "SC",
    weeklySummary:
      "Sarah focused on cloud storage compliance and database infrastructure security. She finalized AWS S3 Glacier transition policies to save 34% in cold storage costs and completed the rollout of WebAuthn hardware tokens across production bastion hosts.",
    decisionsMade: [
      {
        id: "dec-04",
        text: "Transition telemetry logs to Glacier vault storage after 90 days; purge unanonymized logs after 365 days.",
        meeting: "Data Retention & Cold Storage Compliance Review",
        date: "Oct 22, 2026",
      },
      {
        id: "dec-06",
        text: "Enforce hardware FIDO2 / WebAuthn keys for all production database access.",
        meeting: "Security Steering Committee",
        date: "Oct 08, 2026",
      },
    ],
    assignedTasks: [
      {
        id: "tsk-05",
        title: "Configure AWS S3 Glacier lifecycle transitions for raw telemetry buckets",
        priority: "Medium",
        dueDate: "Nov 09, 2026",
        status: "Confirmed",
      },
    ],
    completedWork: [
      {
        id: "comp-01",
        title: "Hardware YubiKey rollout and SMS 2FA deprecation across staging bastions",
        completedDate: "Oct 29, 2026",
        impact: "Attained SOC2 Type II compliance requirement 3 weeks ahead of schedule.",
      },
    ],
    upcomingDeadlines: [
      {
        id: "dl-05",
        title: "AWS S3 Glacier transition script validation in staging",
        deadline: "Nov 09, 2026",
        daysLeft: 9,
        urgency: "On Track",
      },
    ],
  },
  "elena-rostova": {
    id: "elena-rostova",
    name: "Elena Rostova",
    role: "Design Systems Lead",
    avatar: "ER",
    weeklySummary:
      "Elena led the accessibility compliance sync to align the frontend suite with WCAG AAA standards. She established a warm neutral color token palette that eliminates eye strain while guaranteeing 7:1 contrast ratios across dark and light modes.",
    decisionsMade: [
      {
        id: "dec-03",
        text: "Enforce WCAG AAA 7:1 contrast ratios across all primary data tables and user notification banners.",
        meeting: "Design System 2.0 Accessibility Audit",
        date: "Oct 25, 2026",
      },
    ],
    assignedTasks: [
      {
        id: "tsk-04",
        title: "Update Tailwind CSS design system tokens for high-contrast accessibility",
        priority: "Medium",
        dueDate: "Nov 06, 2026",
        status: "In Progress",
      },
    ],
    completedWork: [
      {
        id: "comp-03",
        title: "Completed comprehensive color audit on 42 enterprise dashboard views",
        completedDate: "Oct 26, 2026",
        impact: "Flagged and resolved 11 low-contrast badge tokens.",
      },
    ],
    upcomingDeadlines: [
      {
        id: "dl-04",
        title: "Design System 2.0 token library published to npm registry",
        deadline: "Nov 06, 2026",
        daysLeft: 6,
        urgency: "Approaching",
      },
    ],
  },
  "claire-dupont": {
    id: "claire-dupont",
    name: "Claire Dupont",
    role: "Client Success VP",
    avatar: "CD",
    weeklySummary:
      "Claire negotiated multi-year renewal commitments with key enterprise accounts. She secured 99.95% SLA terms but needs to align with Marcus on Nov 04 regarding how the new 1,200 req/min API ceiling impacts high-frequency enterprise batch integrations.",
    decisionsMade: [
      {
        id: "dec-02",
        text: "Guarantee 99.95% availability with dedicated burst headroom for Enterprise contract renewals in Q4.",
        meeting: "Client Enterprise SLA & Support Tier Overhaul",
        date: "Oct 28, 2026",
      },
    ],
    assignedTasks: [
      {
        id: "tsk-02",
        title: "Draft reconciled Enterprise SLA addendum reflecting 5-min failover limits",
        priority: "High",
        dueDate: "Nov 04, 2026",
        status: "Awaiting Approval",
      },
    ],
    completedWork: [
      {
        id: "comp-04",
        title: "Prepared executive briefing document for Horizon Capital renewal review",
        completedDate: "Oct 28, 2026",
        impact: "Protected $1.2M ARR client renewal account pending architecture signoff.",
      },
    ],
    upcomingDeadlines: [
      {
        id: "dl-02",
        title: "Reconciled Enterprise SLA addendum review meeting with Marcus",
        deadline: "Nov 04, 2026",
        daysLeft: 4,
        urgency: "Immediate",
      },
    ],
  },
};

export const sampleRecapTemplates = [
  {
    title: "Quarterly Platform Scaling & Database Migration",
    date: "2026-10-31",
    recap: `Meeting: Engineering & Product Alignment
Attendees: Sarah Chen, Marcus Vance, Elena Rostova
Date: Oct 31, 2026

Discussion Recap:
1. Marcus presented performance metrics showing write-latency spikes on the legacy MySQL cluster during Monday peak trading hours.
2. Sarah proposed migrating to Google Cloud Spanner to ensure multi-region consistency and eliminate manual sharding overhead.
3. Elena voiced concerns regarding team training and migration downtime windows.
4. Final Decisions Reached:
   - Formally commit to migrating the primary ledger to Cloud Spanner by December 15, 2026.
   - Restrict migration maintenance windows to Sunday 02:00-04:00 UTC to minimize client disruption.
5. Action Items:
   - Marcus Vance: Complete pilot benchmark on staging sandbox by Nov 10, 2026.
   - Sarah Chen: Prepare rollback and disaster recovery failover documentation by Nov 14, 2026.
   - Elena Rostova: Review potential conflict with Marketing's Black Friday traffic freeze policy.`,
  },
  {
    title: "Client Success & Onboarding SLA Review",
    date: "2026-10-31",
    recap: `Meeting: Executive Client Support Protocol
Attendees: Claire Dupont, Liam Patel, Alex Morgan
Date: Oct 31, 2026

Discussion Points:
- Claire reported enterprise client requests for dedicated 15-minute response times for Severity-1 incidents.
- Liam emphasized that our current on-call engineering rotation cannot guarantee sub-15-minute triage without dedicated 24/7 Tier-2 support engineers.
- We decided to implement an automated PagerDuty escalation tier for critical enterprise tenants with a 15-minute acknowledgment SLA, starting Nov 15.
- Next Steps:
   - Liam Patel to configure alert escalation matrix by Nov 8.
   - Claire Dupont to update customer master service agreements by Nov 12.`,
  },
];
