# Grafana Alert Rule: Resend Email Quota High Usage
# Task: T6-03 (Wave W6-GrafanaAlerts)
# F-xx: F-02, F-04, F-18

resource "grafana_rule_group" "mirrorbuddy_slo_alerts" {
  name             = "MirrorBuddy SLO Alerts"
  folder_uid       = grafana_folder.mirrorbuddy.uid
  interval         = "1m"
  org_id           = var.grafana_org_id
  namespace_uid    = grafana_folder.mirrorbuddy.uid
}

resource "grafana_alert_rule" "resend_email_quota_high" {
  org_id              = var.grafana_org_id
  name                = "Resend Email Quota High Usage"
  uid                 = "alert-resend-email-quota-high"
  condition           = "A"
  data {
    ref_id           = "A"
    query_type       = ""
    relative_time_range {
      from           = 600
      to             = 0
    }
    model            = jsonencode({
      expr           = "service_limit_usage_percentage{service=\"resend\",metric=\"emails_month\"} > 85"
      interval       = ""
      refId          = "A"
    })
  }
  no_data_state      = "NoData"
  exec_err_state     = "Alerting"
  for                = "1h"
  group_name         = grafana_rule_group.mirrorbuddy_slo_alerts.name
  folder_uid         = grafana_folder.mirrorbuddy.uid

  # Annotations
  annotation {
    name  = "summary"
    value = "Resend monthly email quota above 85%"
  }
  annotation {
    name  = "description"
    value = "Current usage: {{ $values.A.Value }}%. Free tier limit: 3000/month. Action: Upgrade to Paid ($20/mo) for 50K/month capacity."
  }
  annotation {
    name  = "runbook_url"
    value = "https://mirrorbuddy.grafana.net/d/dashboard/?tab=alert"
  }
  annotation {
    name  = "dashboard_uid"
    value = "dashboard"
  }

  # Labels
  label {
    name  = "severity"
    value = "critical"
  }
  label {
    name  = "service"
    value = "resend"
  }
  label {
    name  = "team"
    value = "platform"
  }
  label {
    name  = "frequency"
    value = "monthly"
  }

  depends_on = [
    grafana_folder.mirrorbuddy,
    grafana_data_source.prometheus
  ]
}

# Notification policy routing
resource "grafana_notification_policy" "resend_alert_routing" {
  org_id = var.grafana_org_id

  group_by       = ["service", "severity"]
  contact_point  = "platform-slack"
  group_wait     = "5m"
  group_interval = "10m"
  repeat_interval = "4h"

  # High severity (critical) - escalate faster
  policy {
    matcher_type = "AND"
    matchers = [
      {
        type  = "=",
        label = "severity",
        value = "critical"
      }
    ]
    contact_point   = "platform-oncall"
    group_wait      = "1m"
    group_interval  = "5m"
    repeat_interval = "1h"
  }

  # Resend service - specific routing
  policy {
    matcher_type = "AND"
    matchers = [
      {
        type  = "=",
        label = "service",
        value = "resend"
      }
    ]
    contact_point   = "platform-slack"
    group_wait      = "5m"
    group_interval  = "10m"
    repeat_interval = "4h"
  }
}

# Data source reference (must exist before alert)
data "grafana_data_source" "prometheus" {
  name = "Prometheus"
}

# Folder reference
resource "grafana_folder" "mirrorbuddy" {
  title = "MirrorBuddy"
}

# Variables
variable "grafana_org_id" {
  description = "Grafana organization ID"
  type        = number
  default     = 1
}

# Contact points (must be created separately)
# See: terraform/contact-points/slack.tf, terraform/contact-points/pagerduty.tf

# Output for reference
output "alert_rule_uid" {
  value       = grafana_alert_rule.resend_email_quota_high.uid
  description = "UID of the Resend email quota alert rule"
}

output "alert_rule_name" {
  value       = grafana_alert_rule.resend_email_quota_high.name
  description = "Name of the alert rule"
}
