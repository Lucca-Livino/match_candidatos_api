import mongoose from 'mongoose';
import crypto from 'node:crypto';

const createUuid = () => crypto.randomUUID();

const RespostaOpcaoSelecionadaSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: createUuid,
      unique: true,
      index: true,
    },
    respostaPergunta_: {
      type: String,
      required: true,
      index: true,
    },
    opcaoRespostaId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    collection: 'respostaOpcaoSelecionada',
    timestamps: false,
  },
);

RespostaOpcaoSelecionadaSchema.index({ respostaPergunta_: 1, opcaoRespostaId: 1 }, { unique: true });

const RespostaOpcaoSelecionada = mongoose.model('RespostaOpcaoSelecionada', RespostaOpcaoSelecionadaSchema);

export default RespostaOpcaoSelecionada;
