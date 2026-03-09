# Jeffyz Solutions Website Deployment (DevOps Project)

This guide explains **step‑by‑step how to deploy a static website using
Docker, Terraform, AWS, GitHub and CI/CD**. It is written in **very
simple language** so you can repeat the project later without confusion.

------------------------------------------------------------------------

# 1. Project Goal

Deploy a static website so it can be accessed on the internet using
**CloudFront CDN**.

Example URL:

https://`<cloudfront-id>`{=html}.cloudfront.net

Technologies used:

-   Docker -- run the website locally
-   Terraform -- create AWS infrastructure
-   AWS -- hosting platform
-   Amazon S3 -- store website files
-   Amazon CloudFront -- global CDN
-   GitHub -- version control
-   GitHub Actions -- CI/CD pipeline

------------------------------------------------------------------------

# 2. Project Architecture

Developer \| v GitHub Repository \| v GitHub Actions (CI/CD) \| v S3
Bucket \| v CloudFront CDN \| v Website Access

When you push code to GitHub, the pipeline automatically:

1.  Uploads website files to S3
2.  Clears CloudFront cache
3.  Website updates automatically

------------------------------------------------------------------------

# 3. Project Folder Structure

Example structure:

jeffyz-solutions-website │ ├── website │ ├── index.html │ ├── style.css
│ └── assets │ ├── terraform │ ├── provider.tf │ ├── s3.tf │ ├──
cloudfront.tf │ └── iam.tf │ ├── Dockerfile │ └── .github └── workflows
└── deploy.yml

------------------------------------------------------------------------

# 4. Run Website Locally Using Docker

Docker helps test the website before deployment.

Dockerfile:

FROM python:3.11-slim

WORKDIR /app

COPY website/ /app

EXPOSE 8000

CMD \["python", "-m", "http.server", "8000"\]

Build Docker image:

docker build -t jeffyz-website .

Run container:

docker run -p 8000:8000 jeffyz-website

Open browser:

http://localhost:8000

------------------------------------------------------------------------

# 5. Push Code to GitHub

Initialize repository:

git init git add . git commit -m "Initial commit"

Connect GitHub repository:

git remote add origin `<repository-url>`{=html} git branch -M main git
push -u origin main

------------------------------------------------------------------------

# 6. Create Infrastructure Using Terraform

Go to the terraform folder:

cd terraform

provider.tf

provider "aws" { region = "us-east-1" }

------------------------------------------------------------------------

s3.tf

resource "aws_s3_bucket" "website_bucket" { bucket =
"jeffyzsolutions-website-bucket" }

resource "aws_s3_bucket_website_configuration" "website_config" { bucket
= aws_s3_bucket.website_bucket.id

index_document { suffix = "index.html" } }

------------------------------------------------------------------------

cloudfront.tf

resource "aws_cloudfront_distribution" "website_cdn" {

origin { domain_name =
aws_s3_bucket_website_configuration.website_config.website_endpoint
origin_id = "s3-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

}

enabled = true default_root_object = "index.html"

default_cache_behavior { allowed_methods = \["GET", "HEAD"\]
cached_methods = \["GET", "HEAD"\]

    target_origin_id = "s3-origin"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

}

restrictions { geo_restriction { restriction_type = "none" } }

viewer_certificate { cloudfront_default_certificate = true } }

------------------------------------------------------------------------

# 7. Deploy Infrastructure

terraform init terraform plan terraform apply

After deployment you will get a CloudFront URL:

https://xxxx.cloudfront.net

------------------------------------------------------------------------

# 8. Upload Website to S3

aws s3 sync website/ s3://jeffyzsolutions-website-bucket

Your website should now load using the CloudFront URL.

------------------------------------------------------------------------

# 9. Create IAM User for CI/CD

resource "aws_iam_user" "github_actions_user" { name =
"github-actions-user" }

resource "aws_iam_access_key" "github_actions_key" { user =
aws_iam_user.github_actions_user.name }

Outputs:

terraform output github_access_key terraform output -raw
github_secret_key

------------------------------------------------------------------------

# 10. Add Secrets to GitHub

GitHub → Repository Settings → Secrets → Actions

Add:

AWS_ACCESS_KEY AWS_SECRET_KEY

------------------------------------------------------------------------

# 11. Create CI/CD Pipeline

.github/workflows/deploy.yml

name: Deploy Website

on: push: branches: - main

jobs: deploy: runs-on: ubuntu-latest

    steps:

      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v3
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
          aws-region: us-east-1

      - name: Upload website to S3
        run: |
          aws s3 sync website/ s3://jeffyzsolutions-website-bucket --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation           --distribution-id YOUR_DISTRIBUTION_ID           --paths "/*"

------------------------------------------------------------------------

# 12. Test CI/CD

git add . git commit -m "update website" git push

GitHub Actions will:

1.  Upload files to S3
2.  Invalidate CloudFront cache
3.  Update website

------------------------------------------------------------------------

# 13. Final Result

https://`<cloudfront-id>`{=html}.cloudfront.net

------------------------------------------------------------------------

# 14. What You Learned

-   Docker for local testing
-   Terraform for Infrastructure as Code
-   AWS S3 for static hosting
-   CloudFront CDN
-   GitHub Actions CI/CD automation

This project demonstrates a **complete beginner DevOps deployment
pipeline**.
