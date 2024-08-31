import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addPlace } from '../reducers/user';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { urlBackend } from '../assets/var';

export default function MapScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.value);
  const nickname = user.nickname;
  const [currentPosition, setCurrentPosition] = useState(null);
  const [tempCoordinates, setTempCoordinates] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlace, setNewPlace] = useState('');
  const [loading, setLoading] = useState(true);

  // Demande des permissions de localisation et surveillance des changements de position
  useEffect(() => {
    (async () => {
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        const status = result?.status;

        if (status === 'granted') {
          const subscription = Location.watchPositionAsync(
            { distanceInterval: 10 },
            (location) => {
              setCurrentPosition(location.coords);
            }
          );

          // Nettoyage de l'abonnement lors du démontage du composant
          return () => subscription.remove();
        }
      } catch (error) {
        console.error('Erreur lors de la demande des permissions de localisation:', error);
      }
    })();
  }, []);

  // Récupération des lieux depuis le backend et mise à jour du store Redux
  useEffect(() => {
    fetch(`${urlBackend}/places/${nickname}`)
      .then((res) => res.json())
      .then((data) => {
        data.places.forEach((place) => {
          dispatch(addPlace(place));
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des lieux:', error);
        setLoading(false);
      });
  }, [dispatch, nickname]);

  // Gestion du long press pour ouvrir la modale et définir les coordonnées temporaires
  const handleLongPress = (e) => {
    setTempCoordinates(e.nativeEvent.coordinate);
    setModalVisible(true);
  };

  // Ajout d'un nouveau lieu au store Redux et au backend
  const handleNewPlace = () => {
    if (!newPlace.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le nouveau lieu.');
      return;
    }

    dispatch(addPlace({
      name: newPlace,
      latitude: tempCoordinates.latitude,
      longitude: tempCoordinates.longitude,
    }));
    setModalVisible(false);
    setNewPlace('');

    fetch(`${urlBackend}/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPlace,
        latitude: tempCoordinates.latitude,
        longitude: tempCoordinates.longitude,
        nickname: nickname,
      }),
    })
      .catch((error) => {
        console.error('Erreur lors de l\'ajout du nouveau lieu:', error);
      });
  };

  // Fermeture de la modale et réinitialisation de l'entrée du nouveau lieu
  const handleClose = () => {
    setModalVisible(false);
    setNewPlace('');
  };

  // Rendu des marqueurs depuis le store Redux
  const markers = user.places.map((data, i) => {
    return <Marker key={i} coordinate={{ latitude: data.latitude, longitude: data.longitude }} title={data.name} />;
  });

  return (
    <View style={styles.container}>
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TextInput
              placeholder="Nouveau lieu"
              onChangeText={(value) => setNewPlace(value)}
              value={newPlace}
              style={styles.input}
            />
            <TouchableOpacity onPress={handleNewPlace} style={styles.button} activeOpacity={0.8}>
              <Text style={styles.textButton}>Ajouter</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.button} activeOpacity={0.8}>
              <Text style={styles.textButton}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MapView onLongPress={handleLongPress} mapType="hybrid" style={styles.map}>
        {currentPosition && <Marker coordinate={currentPosition} title="Ma position" pinColor="#fecb2d" />}
        {markers}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    width: 150,
    borderBottomColor: '#ec6e5b',
    borderBottomWidth: 1,
    fontSize: 16,
  },
  button: {
    width: 150,
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 8,
    backgroundColor: '#ec6e5b',
    borderRadius: 10,
  },
  textButton: {
    color: '#ffffff',
    height: 24,
    fontWeight: '600',
    fontSize: 15,
  },
});
