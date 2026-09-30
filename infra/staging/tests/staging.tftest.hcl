mock_provider "aws" {}
override_data {
  target = data.aws_route53_zone.staging
  values = { name = "staging.beaconandbold.com." }
}
override_data {
  target = data.aws_availability_zones.available
  values = { names = ["eu-central-1a", "eu-central-1b"] }
}
variables {
  zone_id                  = "ZFICTIONAL"
  github_oidc_provider_arn = "arn:aws:iam::212626318809:oidc-provider/token.actions.githubusercontent.com"
  runtime_secret_arn       = "arn:aws:secretsmanager:eu-central-1:212626318809:secret:beacon-bold/staging/runtime-fictional"
  runtime_kms_key_arn      = "arn:aws:kms:eu-central-1:212626318809:key/00000000-0000-0000-0000-000000000001"
  budget_email             = "founder@example.invalid"
  approval_reference       = "TEST-ONLY-NOT-APPROVED"
  postgres_version         = "17.6"
}
run "security_contract" {
  command = plan
  assert {
    condition     = !aws_db_instance.staging.publicly_accessible && aws_db_instance.staging.storage_encrypted && aws_db_instance.staging.deletion_protection
    error_message = "Database must be private, encrypted and protected."
  }
  assert {
    condition     = aws_db_instance.staging.manage_master_user_password && aws_db_instance.staging.password == null
    error_message = "No database password in Terraform state."
  }
  assert {
    condition     = alltrue([for service in aws_ecs_service.service : service.desired_count == 0])
    error_message = "Services start only after successful migration."
  }
  assert {
    condition     = jsondecode(aws_iam_role.github.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:ItsMando98@145494629/Beacon-Bold-Agentic-Operating-System@1398081452:ref:refs/heads/main"
    error_message = "GitHub trust must match immutable repository IDs and main."
  }
  assert {
    condition     = aws_elasticache_replication_group.staging.transit_encryption_enabled && aws_elasticache_replication_group.staging.at_rest_encryption_enabled
    error_message = "Redis requires encryption."
  }
}
