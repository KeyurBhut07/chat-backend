import multer from "multer";

export const multerUpload = multer({
    limits : {
        fileSize : 1024 * 1024 * 5
    }
})

export const signleAvatar = multerUpload.single("avatar")
export const attachmentMulter = multerUpload.array("files",5)