resource "aws_iam_user" "github_actions_user" {
  name = "github-actions-deploy-user"
}

resource "aws_iam_policy" "github_actions_policy" {
  name = "github-actions-s3-cloudfront-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "github_actions_attach" {
  user       = aws_iam_user.github_actions_user.name
  policy_arn = aws_iam_policy.github_actions_policy.arn
}

resource "aws_iam_access_key" "github_actions_key" {
  user = aws_iam_user.github_actions_user.name
}

output "github_access_key" {
  value = aws_iam_access_key.github_actions_key.id
}

output "github_secret_key" {
  value     = aws_iam_access_key.github_actions_key.secret
  sensitive = true
}


