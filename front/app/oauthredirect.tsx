import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OAuthRedirect() {
  const params = useLocalSearchParams();
  // Este archivo es vital para que la app no muestre el error 404 (página no existe) al regresar
  // del navegador de Google en Android. Intercepta la URL y la redirige a signup sin romper iOS/Web.
  return <Redirect href={{ pathname: '/signup', params }} />;
}
