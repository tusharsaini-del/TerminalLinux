pipeline {
 agent any
    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'master', poll: false, url: 'https://github.com/tusharsaini-del/TerminalLinux'
            }
        }

        stage('Build and Push Images') {
            steps {
                script {
                    sh 'docker build -t tushasaini/react-app1 .'
                    withCredentials([usernamePassword(credentialsId: 'dockerhub', passwordVariable: 'ay_pass', usernameVariable: 'ay_user')]) {
                        sh 'docker login -u $ay_user -p $ay_pass'
                        sh 'docker push tushasaini/react-app1 '
                    }
                }
            }
        }

        stage('Deploy Services') {
            steps {
                script {
                    sh 'docker rm -f  react-app1'
                    sh 'docker run -d --name my-react-app2 -p 1155:80 tushasaini/react-app1'
                }
            }
        }
        
        stage('Post Deployment Testing') {
            steps {
                script {
                    sh 'curl -I http://localhost:1155'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline executed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}
