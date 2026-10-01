mock_provider "aws" {}
variables { approval_reference = "TEST-ONLY-NOT-APPROVED" }
run "bootstrap_security" {
  command = plan
  assert {
    condition     = aws_s3_bucket_public_access_block.state.block_public_acls && aws_s3_bucket_public_access_block.state.block_public_policy
    error_message = "State must not be public."
  }
  assert {
    condition     = aws_s3_bucket_versioning.state.versioning_configuration[0].status == "Enabled"
    error_message = "State must be versioned."
  }
  assert {
    condition     = aws_kms_key.state.enable_key_rotation && aws_kms_key.runtime.enable_key_rotation
    error_message = "Keys require rotation."
  }
}
