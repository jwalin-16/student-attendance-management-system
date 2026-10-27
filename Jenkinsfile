pipeline {
    agent any

    environment {
        APP_NAME = 'college-attendance-system'
        DOCKER_IMAGE = "${APP_NAME}:${BUILD_NUMBER}"
        NODE_VERSION = '22'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out source repository from GitHub...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh 'npm ci'
            }
        }

        stage('Static Code Analysis & Lint') {
            steps {
                echo 'Running TypeScript validation and linting...'
                sh 'npm run lint'
            }
        }

        stage('Build Frontend Assets') {
            steps {
                echo 'Compiling client bundle via Vite...'
                sh 'npm run build'
            }
        }

        stage('Execute API & Integration Tests') {
            steps {
                echo 'Running automated API test suite...'
                sh 'node tests/api.test.js'
            }
        }

        stage('Docker Container Build') {
            steps {
                echo "Building Docker container image ${DOCKER_IMAGE}..."
                sh "docker build -t ${DOCKER_IMAGE} -t ${APP_NAME}:latest ."
            }
        }

        stage('Security & Health Sanity') {
            steps {
                echo 'Validating Docker container startup and health check...'
                sh '''
                    docker run -d --name temp_test_container -p 3001:3000 ${APP_NAME}:latest
                    sleep 5
                    curl -f http://localhost:3001/api/health || (docker logs temp_test_container && exit 1)
                    docker stop temp_test_container
                    docker rm temp_test_container
                '''
            }
        }
    }

    post {
        always {
            echo 'Archiving build artifacts and cleaning workspace...'
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "Pipeline succeeded! Application ${APP_NAME} is ready for deployment."
        }
        failure {
            echo 'Build failed. Please inspect stage output logs.'
        }
    }
}
