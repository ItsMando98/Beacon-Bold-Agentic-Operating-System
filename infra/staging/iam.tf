data "aws_caller_identity" "current" {}
locals {
  ecs_trust = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ecs-tasks.amazonaws.com" }, Condition = {
    StringEquals = { "aws:SourceAccount" = "212626318809" }
    ArnLike      = { "aws:SourceArn" = "arn:aws:ecs:eu-central-1:212626318809:*" }
  } }] })
}
resource "aws_iam_role" "task" {
  name               = "beacon-bold-staging-task"
  assume_role_policy = local.ecs_trust
  # Phase 0 applications need no AWS API permissions.
}
resource "aws_iam_role" "execution" {
  for_each           = local.services
  name               = "beacon-bold-staging-execution-${each.key}"
  assume_role_policy = local.ecs_trust
}
resource "aws_iam_role_policy" "execution" {
  for_each = local.services
  role     = aws_iam_role.execution[each.key].id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"], Resource = aws_ecr_repository.service[each.key].arn },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.service[each.key].arn}:*" }
    ], [for statement in [
      { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = concat([var.runtime_secret_arn], each.key == "migrate" ? [aws_db_instance.staging.master_user_secret[0].secret_arn] : []) },
      { Effect = "Allow", Action = ["kms:Decrypt"], Resource = concat([var.runtime_kms_key_arn], each.key == "migrate" ? [aws_kms_key.database.arn] : []), Condition = { StringEquals = { "kms:ViaService" = "secretsmanager.eu-central-1.amazonaws.com" } } }
  ] : statement if length(local.secret_keys[each.key]) > 0]) })
}
resource "aws_iam_role" "github" {
  name                 = "beacon-bold-staging-github-deploy"
  max_session_duration = 3600
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = "sts:AssumeRoleWithWebIdentity", Principal = { Federated = var.github_oidc_provider_arn }, Condition = { StringEquals = {
    "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
    "token.actions.githubusercontent.com:sub" = "repo:ItsMando98@145494629/Beacon-Bold-Agentic-Operating-System@1398081452:ref:refs/heads/main"
  } } }] })
}
resource "aws_iam_role_policy" "github" {
  role = aws_iam_role.github.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:DescribeImages"], Resource = [for repository in aws_ecr_repository.service : repository.arn] },
    # AWS RegisterTaskDefinition and DescribeTaskDefinition do not support resource scoping.
    { Effect = "Allow", Action = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"], Resource = "*", Condition = { StringEquals = { "aws:RequestedRegion" = "eu-central-1" } } },
    { Effect = "Allow", Action = ["ecs:UpdateService", "ecs:DescribeServices"], Resource = [for service in aws_ecs_service.service : service.id] },
    { Effect = "Allow", Action = ["ecs:RunTask"], Resource = "arn:aws:ecs:eu-central-1:212626318809:task-definition/beacon-bold-staging-migrate:*", Condition = { ArnEquals = { "ecs:cluster" = aws_ecs_cluster.staging.arn } } },
    { Effect = "Allow", Action = ["ecs:DescribeTasks", "ecs:StopTask"], Resource = "arn:aws:ecs:eu-central-1:212626318809:task/beacon-bold-staging/*" },
    { Effect = "Allow", Action = ["iam:PassRole"], Resource = concat([aws_iam_role.task.arn], [for role in aws_iam_role.execution : role.arn]), Condition = { StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" } } }
  ] })
}
