variable "zone_id" {
  description = "Existing delegated staging.beaconandbold.com Route53 zone; never the production zone."
  type        = string
}
variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN, bootstrapped by an administrator."
  type        = string
  validation {
    condition     = var.github_oidc_provider_arn == "arn:aws:iam::212626318809:oidc-provider/token.actions.githubusercontent.com"
    error_message = "Only the staging account GitHub provider is allowed."
  }
}
variable "runtime_secret_arn" {
  description = "Pre-populated staging JSON secret; Terraform never reads its value."
  type        = string
  validation {
    condition     = can(regex("^arn:aws:secretsmanager:eu-central-1:212626318809:secret:beacon-bold/staging/runtime-", var.runtime_secret_arn))
    error_message = "Use only the Frankfurt staging runtime secret."
  }
}
variable "runtime_kms_key_arn" {
  description = "Dedicated key for the runtime secret."
  type        = string
}
variable "budget_email" {
  type        = string
  description = "Founder address for actual and forecast budget alerts."
}
variable "approval_reference" {
  type        = string
  description = "Documented founder approval for the saved plan and monthly budget; no default."
  validation {
    condition     = length(trimspace(var.approval_reference)) >= 8
    error_message = "Document a real founder approval before provisioning."
  }
}
variable "postgres_version" {
  type        = string
  description = "Supported PostgreSQL 17 minor version verified in Frankfurt before plan."
  validation {
    condition     = startswith(var.postgres_version, "17.")
    error_message = "Foundation uses PostgreSQL 17."
  }
}
