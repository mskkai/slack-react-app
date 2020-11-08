import firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/storage";

const firebaseConfig = {
  //paste the firebase configuration details
};

firebase.initializeApp(firebaseConfig);

export default firebase;
