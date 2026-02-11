# ============================================================================
# Database Infrastructure Configuration
# Supabase PostgreSQL with pgvector extension
#
# NOTE: Supabase project is managed via dashboard. This file documents
# the expected configuration for reproducibility and DR scenarios.
# Apply extensions manually or via prisma/manual/ SQL scripts.
# ============================================================================

terraform {
  required_version = ">= 1.5"
}

# Variables for documentation and validation
variable "supabase_project_ref" {
  description = "Supabase project reference ID"
  type        = string
  default     = ""
}

variable "database_region" {
  description = "AWS region for Supabase database"
  type        = string
  default     = "eu-west-1"
}

variable "database_plan" {
  description = "Supabase plan tier"
  type        = string
  default     = "pro"

  validation {
    condition     = contains(["free", "pro", "team", "enterprise"], var.database_plan)
    error_message = "Must be free, pro, team, or enterprise."
  }
}

# Output expected configuration for drift detection
output "expected_config" {
  value = {
    provider   = "supabase"
    engine     = "postgresql"
    version    = "16"
    region     = var.database_region
    plan       = var.database_plan
    extensions = ["vector", "pg_trgm"]
    pooler = {
      enabled     = true
      mode        = "transaction"
      port        = 6543
      direct_port = 5432
    }
    backup = {
      daily_enabled = true
      pitr_enabled  = var.database_plan != "free"
      retention     = var.database_plan == "pro" ? "7 days" : "30 days"
    }
    connection_pool = {
      max_connections       = 5
      idle_timeout_ms       = 30000
      connection_timeout_ms = 10000
    }
    ssl = {
      mode           = "verify-full"
      ca_certificate = "config/supabase-chain.pem"
    }
  }
}
