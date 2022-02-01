# Fargate Service

##### Table of Contents  
1. [Assignment](#assignment)  
2. [IAC Choice](#iac)    

<a name="assignment"></a>
### Assignment

You have taken ownership of an old legacy system, but it&#39;s not looking good. The
legacy system builds a docker image that serves a simple HTML page, and deploys
it to a cloud account.  

The page is served using a simple webserver (Nginx, Httpd or similar) but is
password protected (like .htpasswd).  

The problem is, the contents of the docker image, including the password, are all
clearly visible in the repository. Anyone who has read access to the repo knows the
password.  

Your first task as the owner of the legacy system is to ensure secrets handling.
Demonstrate a full deployment and injection of the secret using Infrastructure as
Code (IAC).  

<a name="iac"></a>
### IAC Choice

I went with the AWS CDK in TypeScript for the following reasons:

1. It's customizable and reusable  
2. Leverages full power of programming languages
3. Is extendable through [jsii](https://aws.github.io/jsii/) for multi language support
4. Testable through unit testing

There are some drawbacks, eg it's locked for the AWS Cloud, whereas other languages like
[serverless](https://serverless.com) and [terraform](https://www.terraform.io) are cloud agnostic.
