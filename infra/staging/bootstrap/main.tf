terraform {
  required_version = "~> 1.13.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.14.0"
    }
  }
}
provider "aws" {
  region              = "eu-central-1"
  allowed_account_ids = ["212626318809"]
  default_tags {
    tags = { Project = "beacon-bold", Environment = "staging", ManagedBy = "terraform" }
  }
}
variable "approval_reference" {
  type = string
  validation {
    condition     = length(trimspace(var.approval_reference)) >= 8
    error_message = "Document founder cost approval before bootstrap."
  }
}
resource "aws_kms_key" "state" {
  description             = "Beacon Bold staging Terraform state"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  lifecycle { prevent_destroy = true }
}
resource "aws_kms_key" "runtime" {
  description             = "Beacon Bold staging runtime secrets"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket" "state" {
  bucket = "beacon-bold-staging-state-212626318809"
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn
    }
    bucket_key_enabled = true
  }
}
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Deny", Principal = "*", Action = "s3:*", Resource = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"], Condition = { Bool = { "aws:SecureTransport" = "false" } } }] })
}
resource "aws_route53_zone" "staging" {
  name = "staging.beaconandbold.com"
  lifecycle { prevent_destroy = true }
}
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}
resource "aws_secretsmanager_secret" "runtime" {
  name                    = "beacon-bold/staging/runtime"
  kms_key_id              = aws_kms_key.runtime.arn
  recovery_window_in_days = 30
  lifecycle { prevent_destroy = true }
  # Human populates the value privately; no secret-version resource or data source.
}
output "state_kms_key_arn" { value = aws_kms_key.state.arn }
output "runtime_kms_key_arn" { value = aws_kms_key.runtime.arn }
output "runtime_secret_arn" { value = aws_secretsmanager_secret.runtime.arn }
output "zone_id" { value = aws_route53_zone.staging.zone_id }
output "name_servers" { value = aws_route53_zone.staging.name_servers }
output "github_oidc_provider_arn" { value = aws_iam_openid_connect_provider.github.arn }
