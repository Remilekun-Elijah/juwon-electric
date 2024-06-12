/* eslint-disable react/prop-types */
import * as React from "react";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import ModalDialog from "@mui/joy/ModalDialog";
import DialogTitle from "@mui/joy/DialogTitle";
import DialogContent from "@mui/joy/DialogContent";
import { Transition } from "react-transition-group";

export default function CustomModal({ open, setOpen, children, width, title }) {
  return (
    <React.Fragment>
      <Transition in={open} timeout={400}>
        {(state) => (
          <Modal
            keepMounted
            open={!["exited", "exiting"].includes(state)}
            onClose={() => setOpen(false)}
            slotProps={{
              backdrop: {
                sx: {
                  opacity: 0,
                  backdropFilter: "none",
                  transition: `opacity 400ms, backdrop-filter 400ms`,
                  ...{
                    entering: { opacity: 1, backdropFilter: "blur(8px)" },
                    entered: { opacity: 1, backdropFilter: "blur(8px)" },
                  }[state],
                },
              },
            }}
            sx={{
              visibility: state === "exited" ? "hidden" : "visible",
            }}
          >
            <ModalDialog
              sx={{
                opacity: 0,
                padding: 0,
                transition: `opacity 300ms`,
                overflow: "hidden",
                ...{
                  entering: { opacity: 1 },
                  entered: { opacity: 1 },
                }[state],
                width,
              }}
              className="!py-5 !bg-[#fff]"
            >
              <div className="flex items-center justify-between">
                <DialogTitle className="text-left inter-extrabold text-lg px-5 inline-block">
                  {title}
                </DialogTitle>
                <ModalClose color="light" />
              </div>
              <DialogContent className="!overflow-x-hidden !px-2">
                {children}
              </DialogContent>
            </ModalDialog>
          </Modal>
        )}
      </Transition>
    </React.Fragment>
  );
}
