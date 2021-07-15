<ion-button v-if="!isConnectRef" color="theme" size="max" @click="signal.discover(), isConnectRef = !isConnectRef">Подключиться</ion-button>

<ion-button :disabled="!isConnectRef" color="success" size="max" @click="peerInstance.destroy(), signal.discover(), next()">Пропустить</ion-button>