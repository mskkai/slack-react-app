import React from "react";
import mime from "mime-types";
import { Modal, Input, Icon, Button } from "semantic-ui-react";

class FileModal extends React.Component {
  state = {
    file: null,
    authorized: ["image/jpeg", "image/png"],
  };

  addFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      this.setState({ file: file });
    }
  };

  sendFile = () => {
    const { file } = this.state;
    const { closeModal, uploadFile } = this.props;
    if (file != null) {
      if (this.isAuthorized(file.name)) {
        const metadata = { contentType: mime.lookup(file.name) };
        uploadFile(file, metadata);
        closeModal();
        this.clearFile();
      }
    }
  };

  isAuthorized = (name) => this.state.authorized.includes(mime.lookup(name));

  clearFile = () => this.setState({ file: null });

  render() {
    const { modal, closeModal } = this.props;
    return (
      <Modal basic open={modal} onClose={closeModal}>
        <Modal.Header>Select an Image File</Modal.Header>
        <Modal.Content>
          <Input
            onChange={this.addFile}
            type="file"
            fluid
            label="File types: jpg, png"
            name="file"
          />
        </Modal.Content>
        <Modal.Actions>
          <Button color="green" inverted onClick={this.sendFile}>
            <Icon name="checkmark"></Icon> Send
          </Button>
          <Button color="red" inverted onClick={closeModal}>
            <Icon name="remove"></Icon> Cancel
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

export default FileModal;
