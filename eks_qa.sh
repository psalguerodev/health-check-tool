#!/bin/bash

# Script simple para conectar a EKS
echo "🚀 Conectando a AWS EKS..."

# Configurar AWS SSO
echo "📝 Configurando AWS SSO..."
aws configure sso --no-browser

# Exportar variables
#export AWS_PROFILE=Developer-713881832377
#export EKS_CLUSTER_NAME=servicios-integracion-qa

echo "✅ Perfil AWS: $AWS_PROFILE"
echo "✅ Cluster EKS: $EKS_CLUSTER_NAME"

# Verificar identidad
echo "🔍 Verificando identidad AWS..."
if ! aws sts get-caller-identity; then
    echo "⚠️  Error en verificación. Limpiando variables..."
    unset AWS_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID AWS_SESSION_TOKEN
    echo "🔄 Reintentando verificación..."
    aws sts get-caller-identity
fi

# Actualizar kubeconfig
echo "🔧 Actualizando kubeconfig..."
aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region us-east-1 --profile $AWS_PROFILE

echo "🎉 ¡Conexión completada! Ya puedes usar kubectl"